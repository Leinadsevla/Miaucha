import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  DEFAULT_ALERT_PREFERENCES,
  encodeGeohash,
  geohashWithNeighbors,
  isInQuietHours,
  minutesToTime,
  occurrenceExpiryCutoff,
  parseTime,
  type AlertItem,
  type AlertPreferences,
  type AlertRadiusKm,
  type OccurrenceType,
  type Species,
} from "@miaucha/shared";
import type { Pool } from "pg";
import type { PhotoStorage } from "../storage/photo-storage";
import { UUID_RE } from "../storage/photo-uploads";
import { PG_POOL, PHOTO_STORAGE, PUSH_SENDER } from "../tokens";
import { buildAlertPush, buildSightingPush } from "./alert-params";
import type { PushSender } from "./push-sender";

/** Localização mais antiga que isto não recebe alertas (o usuário pode ter se mudado). */
export const LOCATION_MAX_AGE_DAYS = 30;
const ALERT_LIST_LIMIT = 100;
const COVER_URL_TTL_SECONDS = 3600;

type PrefsRow = { enabled: boolean; radius_km: number; quiet_start: number | null; quiet_end: number | null };

const toPrefs = (row: PrefsRow | undefined): AlertPreferences =>
  row
    ? {
        enabled: row.enabled,
        radiusKm: row.radius_km as AlertRadiusKm,
        quietHours:
          row.quiet_start !== null && row.quiet_end !== null
            ? { start: minutesToTime(row.quiet_start), end: minutesToTime(row.quiet_end) }
            : null,
      }
    : DEFAULT_ALERT_PREFERENCES;

const notFound = () => new NotFoundException("Alerta não encontrado");

@Injectable()
export class AlertsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  /** AL-06: só o último geohash (precisão 6) e a hora. O geohash já chega validado. */
  async updateLocation(userId: string, geohash: string): Promise<void> {
    await this.pool.query(
      `insert into user_locations (user_id, geohash, updated_at) values ($1, $2, now())
       on conflict (user_id) do update set geohash = excluded.geohash, updated_at = now()`,
      [userId, geohash],
    );
  }

  async getPreferences(userId: string): Promise<AlertPreferences> {
    const { rows } = await this.pool.query<PrefsRow>(
      "select enabled, radius_km, quiet_start, quiet_end from alert_preferences where user_id = $1",
      [userId],
    );
    return toPrefs(rows[0]);
  }

  async savePreferences(userId: string, prefs: AlertPreferences): Promise<AlertPreferences> {
    const quietStart = prefs.quietHours ? parseTime(prefs.quietHours.start) : null;
    const quietEnd = prefs.quietHours ? parseTime(prefs.quietHours.end) : null;
    await this.pool.query(
      `insert into alert_preferences (user_id, enabled, radius_km, quiet_start, quiet_end, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (user_id) do update set enabled = excluded.enabled, radius_km = excluded.radius_km,
         quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end, updated_at = now()`,
      [userId, prefs.enabled, prefs.radiusKm, quietStart, quietEnd],
    );
    return this.getPreferences(userId);
  }

  /** O token passa a ser só desta conta (o aparelho pode ter trocado de usuário). */
  async registerPushToken(userId: string, token: string): Promise<void> {
    await this.pool.query(
      `insert into push_tokens (token, user_id, updated_at) values ($1, $2, now())
       on conflict (token) do update set user_id = excluded.user_id, updated_at = now()`,
      [token, userId],
    );
  }

  async removePushToken(userId: string, token: string): Promise<void> {
    await this.pool.query("delete from push_tokens where token = $1 and user_id = $2", [token, userId]);
  }

  async list(userId: string): Promise<AlertItem[]> {
    const { rows } = await this.pool.query<{
      id: string;
      occurrence_id: string;
      distance_meters: number;
      created_at: Date;
      seen_at: Date | null;
      type: OccurrenceType;
      species: Species;
      pet_name: string | null;
      breed: string | null;
      color: string | null;
      approx_address: string | null;
      status: "open" | "resolved";
      occurrence_created_at: Date;
      cover_key: string | null;
    }>(
      `select a.id, a.occurrence_id, a.distance_meters, a.created_at, a.seen_at,
              o.type, o.species, o.pet_name, o.breed, o.color, o.approx_address, o.status, o.created_at as occurrence_created_at,
              (select ph.object_key from occurrence_photos ph
                where ph.occurrence_id = o.id and ph.uploaded_at is not null order by ph.uploaded_at, ph.id limit 1) as cover_key
         from alerts a join occurrences o on o.id = a.occurrence_id
        where a.user_id = $1
        order by a.created_at desc, a.id
        limit $2`,
      [userId, ALERT_LIST_LIMIT],
    );
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        occurrenceId: r.occurrence_id,
        distanceMeters: r.distance_meters,
        createdAt: r.created_at.toISOString(),
        seenAt: r.seen_at?.toISOString() ?? null,
        occurrence: {
          type: r.type,
          species: r.species,
          petName: r.pet_name,
          breed: r.breed,
          color: r.color,
          approxAddress: r.approx_address,
          status: r.status,
          createdAt: r.occurrence_created_at.toISOString(),
          photoUrl: r.cover_key ? await this.storage.presignDownload(r.cover_key, COVER_URL_TTL_SECONDS) : null,
        },
      })),
    );
  }

  async markSeen(userId: string, alertId: string): Promise<void> {
    if (!UUID_RE.test(alertId)) throw notFound();
    const { rowCount } = await this.pool.query(
      "update alerts set seen_at = coalesce(seen_at, now()) where id = $1 and user_id = $2",
      [alertId, userId],
    );
    if (rowCount === 0) throw notFound();
  }

  /**
   * AL-01 / AL-07: encontra quem tem a célula (geohash) a até o raio escolhido do ponto público da ocorrência,
   * grava um alerta para cada um (AL-05: o `unique` do banco impede repetir) e envia push para os novos,
   * exceto quem está no horário de silêncio (AL-04): esses só veem o alerta na lista.
   *
   * Pré-filtro: a célula de precisão 4 da ocorrência e as 8 vizinhas (cada uma tem ≥ 19 km de lado, cobre 5 km
   * para todo lado fora das regiões polares). Filtro exato no PostGIS: alguma parte da célula do usuário a até
   * o raio (sem falso negativo; o usuário pode estar até ~1,3 km além do raio, no canto oposto da célula).
   */
  async dispatchForOccurrence(occurrenceId: string, now: Date = new Date()): Promise<void> {
    const { rows: occ } = await this.pool.query<{
      type: OccurrenceType;
      species: Species;
      pet_name: string | null;
      approx_address: string | null;
      lat: number;
      lng: number;
    }>(
      `select type, species, pet_name, approx_address,
              st_y(public_location::geometry) as lat, st_x(public_location::geometry) as lng
         from occurrences where id = $1 and status = 'open' and updated_at > $2`,
      [occurrenceId, occurrenceExpiryCutoff(now)],
    );
    const occurrence = occ[0];
    if (!occurrence) return;
    // Primeiro o tutor do pet avistado: o alerta dele é o específico, e o `unique` impede o genérico depois.
    await this.notifyOwnerOfSighting(occurrenceId);

    const cells = geohashWithNeighbors(encodeGeohash(occurrence.lat, occurrence.lng, 4));
    const { rows: created } = await this.pool.query<{
      id: string;
      user_id: string;
      distance_meters: number;
      quiet_start: number | null;
      quiet_end: number | null;
    }>(
      `with o as (select id, author_id, public_location from occurrences where id = $1),
       candidates as (
         select l.user_id, p.quiet_start, p.quiet_end,
                round(st_distance(st_pointfromgeohash(l.geohash)::geography, o.public_location))::int as distance_meters
           from user_locations l
           cross join o
           left join alert_preferences p on p.user_id = l.user_id
          where left(l.geohash, 4) = any($2::text[])
            and l.updated_at > now() - make_interval(days => $3)
            and l.user_id <> o.author_id
            and coalesce(p.enabled, true)
            and st_dwithin(st_geomfromgeohash(l.geohash)::geography, o.public_location, coalesce(p.radius_km, $4) * 1000)
       ),
       inserted as (
         insert into alerts (user_id, occurrence_id, distance_meters)
         select user_id, $1, distance_meters from candidates
         on conflict (user_id, occurrence_id) do nothing
         returning id, user_id, distance_meters
       )
       select i.id, i.user_id, i.distance_meters, c.quiet_start, c.quiet_end
         from inserted i join candidates c on c.user_id = i.user_id`,
      [occurrenceId, cells, LOCATION_MAX_AGE_DAYS, DEFAULT_ALERT_PREFERENCES.radiusKm],
    );

    const awake = created.filter(
      (a) =>
        !isInQuietHours(
          a.quiet_start !== null && a.quiet_end !== null ? { start: minutesToTime(a.quiet_start), end: minutesToTime(a.quiet_end) } : null,
          now,
        ),
    );
    if (awake.length === 0) return;

    const { rows: tokens } = await this.pool.query<{ token: string; user_id: string }>(
      "select token, user_id from push_tokens where user_id = any($1::uuid[])",
      [awake.map((a) => a.user_id)],
    );
    const byUser = new Map(awake.map((a) => [a.user_id, a]));
    const messages = tokens.map(({ token, user_id }) => {
      const alert = byUser.get(user_id)!;
      return buildAlertPush(
        {
          occurrenceId,
          alertId: alert.id,
          type: occurrence.type,
          species: occurrence.species,
          petName: occurrence.pet_name,
          approxAddress: occurrence.approx_address,
          distanceMeters: alert.distance_meters,
        },
        token,
      );
    });
    if (messages.length === 0) return;

    const { invalidTokens } = await this.push.send(messages);
    const pushedAlerts = [...new Set(tokens.filter((t) => !invalidTokens.includes(t.token)).map((t) => byUser.get(t.user_id)!.id))];
    await this.pool.query("update alerts set pushed = true where id = any($1::uuid[])", [pushedAlerts]);
    if (invalidTokens.length > 0) await this.pool.query("delete from push_tokens where token = any($1::text[])", [invalidTokens]);
  }

  /**
   * "Vi este pet": o tutor do pet perdido recebe o alerta em qualquer distância e mesmo no horário de
   * silêncio (é o aviso que ele está esperando). A distância é entre os dois pontos públicos.
   */
  private async notifyOwnerOfSighting(sightingId: string): Promise<void> {
    const { rows } = await this.pool.query<{
      alert_id: string;
      owner_id: string;
      pet_name: string | null;
      species: Species;
      approx_address: string | null;
      distance_meters: number;
    }>(
      `with s as (
         select s.id, s.approx_address, l.author_id as owner_id, l.pet_name, l.species,
                round(st_distance(s.public_location, l.public_location))::int as distance_meters
           from occurrences s join occurrences l on l.id = s.sighting_of
          where s.id = $1 and l.status = 'open'
       ),
       inserted as (
         insert into alerts (user_id, occurrence_id, distance_meters)
         select owner_id, id, distance_meters from s
         on conflict (user_id, occurrence_id) do nothing
         returning id
       )
       select i.id as alert_id, s.owner_id, s.pet_name, s.species, s.approx_address, s.distance_meters
         from inserted i cross join s`,
      [sightingId],
    );
    const sighting = rows[0];
    if (!sighting) return;
    const { rows: tokens } = await this.pool.query<{ token: string }>("select token from push_tokens where user_id = $1", [sighting.owner_id]);
    if (tokens.length === 0) return;
    const { invalidTokens } = await this.push.send(
      tokens.map(({ token }) =>
        buildSightingPush(
          {
            occurrenceId: sightingId,
            alertId: sighting.alert_id,
            petName: sighting.pet_name,
            species: sighting.species,
            approxAddress: sighting.approx_address,
            distanceMeters: sighting.distance_meters,
          },
          token,
        ),
      ),
    );
    if (tokens.some((t) => !invalidTokens.includes(t.token))) {
      await this.pool.query("update alerts set pushed = true where id = $1", [sighting.alert_id]);
    }
    if (invalidTokens.length > 0) await this.pool.query("delete from push_tokens where token = any($1::text[])", [invalidTokens]);
  }
}
