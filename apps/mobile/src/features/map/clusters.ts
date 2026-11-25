import Supercluster from "supercluster";
import type { LatLng, PublicOccurrence } from "@miaucha/shared";
import { regionToBBox, regionToZoom, zoomInto, type Region } from "./region";

export type ClusterItem = { kind: "cluster"; id: number; count: number; coordinate: LatLng };
export type OccurrenceItem = { kind: "occurrence"; occurrence: PublicOccurrence; coordinate: LatLng };
/** O que o mapa desenha: um grupo com a contagem ou uma ocorrência. */
export type MapItem = ClusterItem | OccurrenceItem;

type Props = { occurrence: PublicOccurrence };

/** Raio do agrupamento, em pixels de tela. */
const CLUSTER_RADIUS_PX = 60;
/** Acima deste zoom não agrupa mais (pontos no mesmo quarteirão já aparecem separados). */
const MAX_CLUSTER_ZOOM = 16;

export type ClusterIndex = {
  itemsIn(region: Region, widthPx: number): MapItem[];
  expansionZoom(clusterId: number): number;
};

/** MP-03: agrupa as ocorrências com o supercluster, pelo local público (MP-07). */
export function createClusterIndex(occurrences: PublicOccurrence[]): ClusterIndex {
  const index = new Supercluster<Props>({ radius: CLUSTER_RADIUS_PX, maxZoom: MAX_CLUSTER_ZOOM });
  index.load(
    occurrences.map((occurrence) => ({
      type: "Feature" as const,
      properties: { occurrence },
      geometry: { type: "Point" as const, coordinates: [occurrence.publicLocation.lng, occurrence.publicLocation.lat] },
    })),
  );

  return {
    itemsIn(region, widthPx) {
      // Com folga, para os marcadores da borda não sumirem e voltarem ao arrastar.
      const { minLng, minLat, maxLng, maxLat } = regionToBBox(region, 0.25);
      const zoom = Math.max(0, Math.round(regionToZoom(region, widthPx)));
      return index.getClusters([minLng, minLat, maxLng, maxLat], zoom).map((feature): MapItem => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        if ("cluster" in props && props.cluster) {
          return { kind: "cluster", id: props.cluster_id, count: props.point_count, coordinate: { lat, lng } };
        }
        const { occurrence } = props as Props;
        return { kind: "occurrence", occurrence, coordinate: occurrence.publicLocation };
      });
    },
    expansionZoom: (clusterId) => index.getClusterExpansionZoom(clusterId),
  };
}

/** Região para "abrir" um grupo tocado: centrada nele, no zoom em que ele se separa. */
export function expansionRegion(index: ClusterIndex, cluster: ClusterItem, region: Region, widthPx: number): Region {
  // +0,5 para o arredondamento do zoom em `itemsIn` não cair de volta no nível agrupado.
  const zoom = Math.max(index.expansionZoom(cluster.id) + 0.5, regionToZoom(region, widthPx) + 1);
  return zoomInto(region, cluster.coordinate, zoom, widthPx);
}
