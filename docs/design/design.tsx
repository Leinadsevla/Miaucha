import { useState, useEffect } from "react";
import {
  Home,
  Map,
  Bell,
  MessageCircle,
  User,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Share2,
  Eye,
  Camera,
  Send,
  Star,
  AlertTriangle,
  Heart,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Check,
  Navigation,
  Clock,
  Filter,
  BellOff,
  Stethoscope,
  ShoppingBag,
  Dog,
  Cat,
  Smile,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "login"
  | "home"
  | "register-pet"
  | "map"
  | "pet-details"
  | "chat"
  | "alerts"
  | "directory"
  | "profile";

// ─── Pet Data ─────────────────────────────────────────────────────────────────

const PETS = [
  {
    id: 1,
    name: "Thor",
    species: "dog",
    breed: "Golden Retriever",
    color: "Dourado",
    age: "3 anos",
    owner: "Ana Souza",
    ownerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format",
    distance: "0,3 km",
    timeAgo: "2h atrás",
    lastSeen: "Av. Paulista, 1000 - São Paulo",
    status: "Perdido",
    image: "https://images.unsplash.com/photo-1671551348709-7a1710c806d9?w=400&h=400&fit=crop&auto=format",
    description: "Thor desapareceu no começo da tarde de hoje. Ele é muito dócil e brinca com qualquer pessoa. Usa coleira azul com plaquinha de identidade.",
    lat: -23.561, lng: -46.656,
  },
  {
    id: 2,
    name: "Mia",
    species: "cat",
    breed: "Persa",
    color: "Branca e cinza",
    age: "2 anos",
    owner: "Carlos Lima",
    ownerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    distance: "0,7 km",
    timeAgo: "5h atrás",
    lastSeen: "Rua Augusta, 350 - São Paulo",
    status: "Perdido",
    image: "https://images.unsplash.com/photo-1583098026747-559b9f41e586?w=400&h=400&fit=crop&auto=format",
    description: "Mia fugiu pela janela durante a noite. É uma gata tímida, mas responde ao nome. Não tem coleira mas é microchipada.",
    lat: -23.557, lng: -46.661,
  },
  {
    id: 3,
    name: "Rex",
    species: "dog",
    breed: "Labrador",
    color: "Preto",
    age: "5 anos",
    owner: "Julia Mendes",
    ownerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format",
    distance: "1,2 km",
    timeAgo: "1 dia",
    lastSeen: "Parque Ibirapuera - São Paulo",
    status: "Perdido",
    image: "https://images.unsplash.com/photo-1580058549070-b0464f69500f?w=400&h=400&fit=crop&auto=format",
    description: "Rex correu atrás de outro cão no parque e sumiu. Muito energético e amigável. Tem uma cicatriz na pata dianteira esquerda.",
    lat: -23.588, lng: -46.657,
  },
  {
    id: 4,
    name: "Luna",
    species: "cat",
    breed: "SRD",
    color: "Tigrada",
    age: "1 ano",
    owner: "Pedro Oliveira",
    ownerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
    distance: "1,8 km",
    timeAgo: "3h atrás",
    lastSeen: "Vila Madalena - São Paulo",
    status: "Perdido",
    image: "https://images.unsplash.com/photo-1777348298174-93887988191d?w=400&h=400&fit=crop&auto=format",
    description: "Luna saiu do apartamento quando a porta ficou aberta. É muito curiosa e pode ter subido em algum telhado próximo.",
    lat: -23.563, lng: -46.690,
  },
];

const DIRECTORY = [
  { id: 1, name: "Clínica Vet São Paulo", type: "clinic", rating: 4.8, reviews: 312, distance: "0,5 km", address: "Av. Brigadeiro Faria Lima, 1234", icon: "clinic" },
  { id: 2, name: "ONG Patinhas Unidas", type: "ong", rating: 4.9, reviews: 189, distance: "1,1 km", address: "Rua dos Pinheiros, 567", icon: "ong" },
  { id: 3, name: "PetShop Animal House", type: "petshop", rating: 4.6, reviews: 243, distance: "0,8 km", address: "Rua Oscar Freire, 890", icon: "petshop" },
  { id: 4, name: "Hospital Veterinário 24h", type: "clinic", rating: 4.7, reviews: 521, distance: "2,3 km", address: "Av. Rebouças, 2100", icon: "clinic" },
  { id: 5, name: "ONG Animais SP", type: "ong", rating: 4.8, reviews: 98, distance: "1,5 km", address: "Rua Consolação, 3200", icon: "ong" },
];

// ─── Map Pins positions (relative to SVG viewBox 0 0 320 260) ─────────────────

const MAP_PINS = [
  { id: 1, x: 140, y: 110, species: "dog", name: "Thor" },
  { id: 2, x: 200, y: 90, species: "cat", name: "Mia" },
  { id: 3, x: 80, y: 160, species: "dog", name: "Rex" },
  { id: 4, x: 240, y: 145, species: "cat", name: "Luna" },
];

// ─── Chat Messages ────────────────────────────────────────────────────────────

const MESSAGES = [
  { id: 1, sender: "them", text: "Oi! Vi um cão parecido com o Thor na Av. Paulista agora pouco.", time: "14:32" },
  { id: 2, sender: "me", text: "Sério?? Como ele estava? Tinha coleira?", time: "14:33" },
  { id: 3, sender: "them", text: "Sim, coleira azul! Estava andando sozinho perto do metrô Brigadeiro.", time: "14:33" },
  { id: 4, sender: "me", text: "Obrigada!! Vou até lá agora. Você pode me mandar a localização exata?", time: "14:34" },
  { id: 5, sender: "them", text: "📍 Localização compartilhada", time: "14:34", isLocation: true },
  { id: 6, sender: "me", text: "Perfeito! Estou indo agora!! 🙏", time: "14:35" },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      {status}
    </span>
  );
}

function SpeciesIcon({ species, size = 16 }: { species: string; size?: number }) {
  return species === "dog"
    ? <Dog size={size} />
    : <Cat size={size} />;
}

function PetCard({
  pet,
  onClick,
}: {
  pet: (typeof PETS)[0];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-52 bg-white rounded-2xl shadow-sm border border-border overflow-hidden text-left hover:shadow-md transition-shadow"
    >
      <div className="relative h-36 bg-muted">
        <img
          src={pet.image}
          alt={pet.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2">
          <StatusBadge status={pet.status} />
        </div>
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <SpeciesIcon species={pet.species} size={14} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground text-sm">{pet.name}</p>
          <span className="text-xs text-muted-foreground">{pet.distance}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{pet.breed}</p>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <MapPin size={11} className="text-primary" />
          <span className="truncate">{pet.lastSeen.split("-")[0].trim()}</span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock size={11} className="text-accent" />
          <span>{pet.timeAgo}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({
  active,
  onNavigate,
}: {
  active: Screen;
  onNavigate: (s: Screen) => void;
}) {
  const items: { screen: Screen; icon: React.ReactNode; label: string }[] = [
    { screen: "home", icon: <Home size={20} />, label: "Início" },
    { screen: "map", icon: <Map size={20} />, label: "Mapa" },
    { screen: "alerts", icon: <Bell size={20} />, label: "Alertas" },
    { screen: "chat", icon: <MessageCircle size={20} />, label: "Chat" },
    { screen: "profile", icon: <User size={20} />, label: "Perfil" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border flex items-center px-1 pb-2 pt-2 z-20">
      {items.map((item) => (
        <button
          key={item.screen}
          onClick={() => onNavigate(item.screen)}
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors",
            active === item.screen
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <span className={cn(
            "transition-transform",
            active === item.screen && "scale-110"
          )}>
            {item.icon}
          </span>
          <span className={cn(
            "text-[10px] font-semibold",
            active === item.screen ? "text-primary" : "text-muted-foreground"
          )}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Screen: Splash ───────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(onNext, 2600);
    return () => clearTimeout(t);
  }, [onNext]);

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-primary">
      {/* background paw prints */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="absolute text-white text-2xl select-none"
            style={{
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              fontSize: `${14 + Math.random() * 18}px`,
            }}
          >
            🐾
          </span>
        ))}
      </div>

      {/* logo area */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* icon */}
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-xl">
          <span className="text-5xl">🐾</span>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Miaucha
          </h1>
          <p className="text-white/70 text-sm font-medium mt-1">
            Conectando pets aos seus lares
          </p>
        </div>

        {/* loading dots */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-white/40 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>

      {/* bottom tagline */}
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <p className="text-white/50 text-xs">Versão 1.0.0 • TCC 2024</p>
      </div>
    </div>
  );
}

// ─── Screen: Login ────────────────────────────────────────────────────────────

function LoginScreen({ onNext }: { onNext: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background">
      {/* hero illustration */}
      <div className="bg-primary px-6 pt-10 pb-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
          <span className="text-3xl">🐾</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white">Bem-vindo ao Miaucha</h2>
          <p className="text-white/70 text-sm mt-1">Juntos encontramos quem se perdeu</p>
        </div>
        <div className="flex gap-2 mt-2">
          <img
            src="https://images.unsplash.com/photo-1580058549070-b0464f69500f?w=80&h=80&fit=crop&auto=format"
            alt="dog"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow"
          />
          <img
            src="https://images.unsplash.com/photo-1583098026747-559b9f41e586?w=80&h=80&fit=crop&auto=format"
            alt="cat"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow mt-2"
          />
          <img
            src="https://images.unsplash.com/photo-1671551348709-7a1710c806d9?w=80&h=80&fit=crop&auto=format"
            alt="dog2"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow"
          />
        </div>
      </div>

      {/* tab switcher */}
      <div className="mx-5 mt-5 bg-muted rounded-2xl p-1 flex">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              tab === t
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {t === "login" ? "Entrar" : "Cadastrar"}
          </button>
        ))}
      </div>

      {/* form */}
      <div className="px-5 mt-5 flex flex-col gap-3 pb-6">
        {tab === "register" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome completo</label>
            <input
              className="w-full px-4 py-3 rounded-2xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors"
              placeholder="Seu nome"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail</label>
          <input
            className="w-full px-4 py-3 rounded-2xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors"
            placeholder="seu@email.com"
            type="email"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Senha</label>
          <input
            className="w-full px-4 py-3 rounded-2xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors"
            placeholder="••••••••"
            type="password"
          />
        </div>
        {tab === "login" && (
          <button className="text-xs text-primary font-semibold text-right">
            Esqueci minha senha
          </button>
        )}

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-accent text-white font-bold text-base shadow-md hover:brightness-105 active:scale-95 transition-all mt-2"
        >
          {tab === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div className="relative flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button className="w-full py-3.5 rounded-2xl border border-border bg-white font-bold text-sm text-foreground flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-shadow">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

function HomeScreen({
  onNavigate,
  onPetClick,
}: {
  onNavigate: (s: Screen) => void;
  onPetClick: (pet: (typeof PETS)[0]) => void;
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="bg-primary px-5 pt-10 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-semibold">Olá, Ana 👋</p>
            <h2 className="text-white text-lg font-black">Encontre pets perto de você</h2>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Bell size={18} className="text-white" />
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-foreground text-sm outline-none shadow-sm"
            placeholder="Buscar por raça, nome, região..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* mini map preview */}
        <div
          className="mx-5 mt-4 rounded-3xl overflow-hidden shadow-md cursor-pointer relative"
          onClick={() => onNavigate("map")}
        >
          <MiniMapPreview />
          <div className="absolute bottom-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
            <Map size={11} />
            Ver mapa completo
          </div>
        </div>

        {/* alert banner */}
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-800">4 pets desaparecidos próximos</p>
            <p className="text-xs text-amber-600 truncate">Raio de 2 km · São Paulo, SP</p>
          </div>
          <ChevronRight size={16} className="text-amber-500 flex-shrink-0" />
        </div>

        {/* nearby pets */}
        <div className="mt-5 px-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground text-sm">Pets próximos</h3>
            <button className="text-xs text-primary font-bold">Ver todos</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PETS.map((pet) => (
              <PetCard key={pet.id} pet={pet} onClick={() => onPetClick(pet)} />
            ))}
          </div>
        </div>

        {/* quick actions */}
        <div className="px-5 mt-5">
          <h3 className="font-bold text-foreground text-sm mb-3">Ações rápidas</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🗺️", label: "Alertas\nna região", color: "bg-orange-50", border: "border-orange-100" },
              { icon: "📋", label: "Diretório\nVet", color: "bg-blue-50", border: "border-blue-100", action: "directory" as Screen },
              { icon: "🤝", label: "Como\najudar", color: "bg-green-50", border: "border-green-100" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => item.action && onNavigate(item.action)}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 rounded-2xl border",
                  item.color,
                  item.border
                )}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-bold text-foreground text-center whitespace-pre-line leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => onNavigate("register-pet")}
        className="absolute bottom-20 right-5 bg-accent text-white rounded-2xl px-4 py-3 flex items-center gap-2 shadow-xl hover:brightness-105 active:scale-95 transition-all z-10"
      >
        <Plus size={18} />
        <span className="text-sm font-bold">Registrar Pet Perdido</span>
      </button>
    </div>
  );
}

// ─── Mini Map Preview ─────────────────────────────────────────────────────────

function MiniMapPreview() {
  return (
    <div className="relative h-36 bg-[#e8f0e8]">
      <svg viewBox="0 0 320 144" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Roads */}
        <rect x="0" y="65" width="320" height="14" fill="#f0ece4" />
        <rect x="148" y="0" width="24" height="144" fill="#f0ece4" />
        <rect x="0" y="105" width="320" height="8" fill="#f5f1ea" />
        <rect x="80" y="0" width="14" height="144" fill="#f5f1ea" />
        <rect x="240" y="0" width="14" height="144" fill="#f5f1ea" />
        {/* Blocks */}
        <rect x="16" y="16" width="56" height="44" rx="4" fill="#d4e8d4" />
        <rect x="98" y="16" width="44" height="44" rx="4" fill="#d4e8d4" />
        <rect x="178" y="16" width="56" height="44" rx="4" fill="#c8dfc8" />
        <rect x="16" y="82" width="56" height="54" rx="4" fill="#c8dfc8" />
        <rect x="98" y="82" width="44" height="54" rx="4" fill="#d4e8d4" />
        <rect x="178" y="82" width="56" height="54" rx="4" fill="#d4e8d4" />
        <rect x="258" y="82" width="46" height="54" rx="4" fill="#c8dfc8" />
        <rect x="258" y="16" width="46" height="44" rx="4" fill="#d4e8d4" />
        {/* Pin 1 - dog */}
        <circle cx="140" cy="72" r="12" fill="#FF8A3D" opacity="0.2" />
        <circle cx="140" cy="72" r="7" fill="#FF8A3D" />
        <text x="140" y="76" textAnchor="middle" fontSize="8" fill="white">🐕</text>
        {/* Pin 2 - cat */}
        <circle cx="200" cy="55" r="12" fill="#2D6CDF" opacity="0.2" />
        <circle cx="200" cy="55" r="7" fill="#2D6CDF" />
        <text x="200" y="59" textAnchor="middle" fontSize="8" fill="white">🐈</text>
        {/* Pin 3 */}
        <circle cx="82" cy="108" r="7" fill="#FF8A3D" />
        <text x="82" y="112" textAnchor="middle" fontSize="8" fill="white">🐕</text>
        {/* User location */}
        <circle cx="160" cy="72" r="8" fill="#FF9E5E" opacity="0.3" />
        <circle cx="160" cy="72" r="4" fill="#FF9E5E" />
        <circle cx="160" cy="72" r="3" fill="white" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

// ─── Screen: Register Pet ─────────────────────────────────────────────────────

function RegisterPetScreen({ onBack }: { onBack: () => void }) {
  const [species, setSpecies] = useState<"dog" | "cat">("dog");

  return (
    <div className="h-full flex flex-col bg-background">
      {/* header */}
      <div className="bg-white px-5 pt-10 pb-4 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h2 className="font-black text-foreground text-base">Registrar Pet Perdido</h2>
          <p className="text-xs text-muted-foreground">Preencha os dados do seu pet</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 flex flex-col gap-4">
        {/* photo upload */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">FOTO DO ANIMAL</p>
          <div className="h-36 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Camera size={20} className="text-primary" />
            </div>
            <p className="text-xs font-bold text-primary">Adicionar foto</p>
            <p className="text-[10px] text-muted-foreground">JPG, PNG até 10MB</p>
          </div>
        </div>

        {/* species */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">TIPO DE ANIMAL</p>
          <div className="flex gap-3">
            {(["dog", "cat"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpecies(s)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold text-sm transition-all",
                  species === s
                    ? "border-primary bg-primary text-white"
                    : "border-border text-muted-foreground"
                )}
              >
                <SpeciesIcon species={s} size={18} />
                {s === "dog" ? "Cão" : "Gato"}
              </button>
            ))}
          </div>
        </div>

        {/* fields */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm flex flex-col gap-3">
          <p className="text-xs font-bold text-muted-foreground">INFORMAÇÕES DO PET</p>
          {[
            { label: "Nome do pet", placeholder: "Ex: Thor, Luna..." },
            { label: "Raça", placeholder: "Ex: Golden Retriever, SRD..." },
            { label: "Cor predominante", placeholder: "Ex: Dourado, Preto e Branco..." },
            { label: "Idade aproximada", placeholder: "Ex: 3 anos" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">{f.label}</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        {/* last location */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">ÚLTIMO LOCAL VISTO</p>
          <div className="h-28 rounded-2xl bg-[#e8f0e8] overflow-hidden relative mb-3">
            <svg viewBox="0 0 280 112" className="w-full h-full">
              <rect x="0" y="50" width="280" height="12" fill="#f0ece4" />
              <rect x="120" y="0" width="20" height="112" fill="#f0ece4" />
              <rect x="0" y="75" width="280" height="8" fill="#f5f1ea" />
              <rect x="60" y="0" width="12" height="112" fill="#f5f1ea" />
              <rect x="200" y="0" width="12" height="112" fill="#f5f1ea" />
              <rect x="10" y="10" width="44" height="36" rx="3" fill="#d4e8d4" />
              <rect x="80" y="10" width="36" height="36" rx="3" fill="#c8dfc8" />
              <rect x="148" y="10" width="46" height="36" rx="3" fill="#d4e8d4" />
              <rect x="218" y="10" width="50" height="36" rx="3" fill="#c8dfc8" />
              <rect x="10" y="68" width="44" height="38" rx="3" fill="#c8dfc8" />
              <rect x="80" y="68" width="36" height="38" rx="3" fill="#d4e8d4" />
              <rect x="148" y="68" width="46" height="38" rx="3" fill="#c8dfc8" />
              <circle cx="140" cy="56" r="9" fill="#2D6CDF" opacity="0.25" />
              <circle cx="140" cy="56" r="6" fill="#2D6CDF" />
              <polygon points="140,43 144,50 136,50" fill="#2D6CDF" />
            </svg>
            <div className="absolute bottom-2 right-2 bg-white rounded-lg px-2 py-1 text-[10px] font-bold text-primary shadow-sm flex items-center gap-1">
              <Navigation size={9} /> Ajustar pin
            </div>
          </div>
          <input
            className="w-full px-4 py-3 rounded-xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors"
            placeholder="Av. Paulista, 1000 - São Paulo, SP"
          />
        </div>

        {/* description */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3">DESCRIÇÃO ADICIONAL</p>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-input-background text-foreground text-sm outline-none border border-transparent focus:border-primary transition-colors resize-none"
            rows={3}
            placeholder="Descreva características especiais, comportamento, roupa, coleira, etc..."
          />
        </div>
      </div>

      {/* bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border px-5 py-4">
        <button className="w-full py-4 rounded-2xl bg-accent text-white font-black text-base shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2">
          <AlertTriangle size={18} />
          Emitir Alerta
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Map ─────────────────────────────────────────────────────────────

function MapScreen({
  onBack,
  onPetClick,
}: {
  onBack: () => void;
  onPetClick: (pet: (typeof PETS)[0]) => void;
}) {
  const [selectedPin, setSelectedPin] = useState<number | null>(null);

  const selectedPet = selectedPin ? PETS.find((p) => p.id === selectedPin) : null;

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#e8f0e8]">
      {/* Full map SVG */}
      <svg viewBox="0 0 320 620" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="620" fill="#e8f0e8" />
        {/* roads */}
        <rect x="0" y="200" width="320" height="18" fill="#f0ece4" />
        <rect x="0" y="360" width="320" height="18" fill="#f0ece4" />
        <rect x="0" y="500" width="320" height="14" fill="#f5f1ea" />
        <rect x="145" y="0" width="30" height="620" fill="#f0ece4" />
        <rect x="70" y="0" width="18" height="620" fill="#f5f1ea" />
        <rect x="232" y="0" width="18" height="620" fill="#f5f1ea" />
        {/* blocks */}
        {[
          [10, 20, 52, 172], [98, 20, 40, 172], [178, 20, 46, 172], [250, 20, 60, 172],
          [10, 226, 52, 126], [98, 226, 40, 126], [178, 226, 46, 126], [250, 226, 60, 126],
          [10, 386, 52, 106], [98, 386, 40, 106], [178, 386, 46, 106], [250, 386, 60, 106],
          [10, 522, 52, 88], [98, 522, 40, 88], [178, 522, 46, 88], [250, 522, 60, 88],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="5" fill={i % 3 === 0 ? "#c8dfc8" : "#d4e8d4"} />
        ))}
        {/* alert zone */}
        <circle cx="160" cy="280" r="80" fill="#2D6CDF" opacity="0.08" stroke="#2D6CDF" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>

      {/* Pins */}
      <div className="absolute inset-0">
        {MAP_PINS.map((pin) => {
          const pet = PETS.find((p) => p.id === pin.id)!;
          const isSelected = selectedPin === pin.id;
          const pct_x = (pin.x / 320) * 100;
          const pct_y = (pin.y / 620) * 100;
          return (
            <button
              key={pin.id}
              onClick={() => setSelectedPin(isSelected ? null : pin.id)}
              className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
              style={{ left: `${pct_x}%`, top: `${pct_y}%` }}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2",
                pin.species === "dog"
                  ? "bg-primary border-orange-200"
                  : "bg-accent border-blue-200",
                isSelected && "scale-125"
              )}>
                <span className="text-lg">{pin.species === "dog" ? "🐕" : "🐈"}</span>
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full mx-auto -mt-0.5",
                pin.species === "dog" ? "bg-primary" : "bg-accent"
              )} />
            </button>
          );
        })}

        {/* User location */}
        <div className="absolute" style={{ left: "50%", top: "45%", transform: "translate(-50%,-50%)" }}>
          <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <div className="absolute inset-0 rounded-full bg-primary/20 scale-150 animate-ping" />
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-10 pb-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center">
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2.5">
          <Search size={15} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Buscar no mapa...</span>
        </div>
        <button className="w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center">
          <Filter size={16} className="text-foreground" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-24 right-4 bg-white rounded-2xl shadow-md p-3 flex flex-col gap-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center">
            <Dog size={10} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Cão</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-accent flex items-center justify-center">
            <Cat size={10} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Gato</span>
        </div>
      </div>

      {/* Selected pet popup */}
      {selectedPet && (
        <div className="absolute bottom-6 left-4 right-4 bg-white rounded-3xl shadow-xl p-4 flex gap-3 z-10">
          <img
            src={selectedPet.image}
            alt={selectedPet.name}
            className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-black text-foreground text-sm">{selectedPet.name}</p>
              <StatusBadge status={selectedPet.status} />
            </div>
            <p className="text-xs text-muted-foreground">{selectedPet.breed} · {selectedPet.color}</p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-primary" />
              <span className="text-xs text-muted-foreground truncate">{selectedPet.distance} de você</span>
            </div>
            <button
              onClick={() => onPetClick(selectedPet)}
              className="mt-2 w-full py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Ver detalhes
            </button>
          </div>
          <button onClick={() => setSelectedPin(null)} className="self-start">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Screen: Pet Details ──────────────────────────────────────────────────────

function PetDetailsScreen({
  pet,
  onBack,
  onChat,
}: {
  pet: (typeof PETS)[0];
  onBack: () => void;
  onChat: () => void;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* image */}
      <div className="relative h-64 bg-muted flex-shrink-0">
        <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-10 left-4 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          onClick={() => setLiked(!liked)}
          className="absolute top-10 right-4 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart size={18} className={liked ? "text-red-400 fill-red-400" : "text-white"} />
        </button>
        <div className="absolute bottom-4 left-4">
          <StatusBadge status={pet.status} />
          <h2 className="text-white text-2xl font-black mt-1">{pet.name}</h2>
          <p className="text-white/80 text-sm">{pet.breed} · {pet.color}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* owner */}
        <div className="mx-5 mt-4 bg-white rounded-3xl p-4 border border-border shadow-sm flex items-center gap-3">
          <img src={pet.ownerAvatar} alt={pet.owner} className="w-12 h-12 rounded-2xl object-cover" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Tutor</p>
            <p className="font-bold text-foreground text-sm">{pet.owner}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-accent" />
              <span className="text-xs text-muted-foreground">{pet.timeAgo}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onChat} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </button>
            <button className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* details grid */}
        <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
          {[
            { label: "Raça", value: pet.breed, icon: "🐾" },
            { label: "Cor", value: pet.color, icon: "🎨" },
            { label: "Idade", value: pet.age, icon: "🎂" },
            { label: "Distância", value: pet.distance, icon: "📍" },
          ].map((d) => (
            <div key={d.label} className="bg-white rounded-2xl p-3 border border-border shadow-sm">
              <span className="text-lg">{d.icon}</span>
              <p className="text-xs text-muted-foreground mt-1">{d.label}</p>
              <p className="font-bold text-foreground text-sm">{d.value}</p>
            </div>
          ))}
        </div>

        {/* description */}
        <div className="mx-5 mt-3 bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-2">DESCRIÇÃO</p>
          <p className="text-sm text-foreground leading-relaxed">{pet.description}</p>
        </div>

        {/* last seen map */}
        <div className="mx-5 mt-3 bg-white rounded-3xl overflow-hidden border border-border shadow-sm">
          <div className="h-28 relative bg-[#e8f0e8]">
            <svg viewBox="0 0 280 112" className="w-full h-full">
              <rect width="280" height="112" fill="#e8f0e8" />
              <rect x="0" y="50" width="280" height="12" fill="#f0ece4" />
              <rect x="120" y="0" width="20" height="112" fill="#f0ece4" />
              <rect x="10" y="10" width="104" height="35" rx="4" fill="#d4e8d4" />
              <rect x="148" y="10" width="120" height="35" rx="4" fill="#c8dfc8" />
              <rect x="10" y="68" width="104" height="36" rx="4" fill="#c8dfc8" />
              <rect x="148" y="68" width="120" height="36" rx="4" fill="#d4e8d4" />
              <circle cx="140" cy="56" r="10" fill="#2D6CDF" opacity="0.3" />
              <circle cx="140" cy="56" r="6" fill="#2D6CDF" />
              <polygon points="140,42 144,50 136,50" fill="#2D6CDF" />
            </svg>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground">ÚLTIMO LOCAL VISTO</p>
                <p className="text-sm font-semibold text-foreground">{pet.lastSeen}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* action buttons */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border px-5 py-4 flex gap-3">
        <button
          onClick={onChat}
          className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <MessageCircle size={16} />
          Entrar em contato
        </button>
        <button className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <Eye size={18} className="text-green-600" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
          <Share2 size={18} className="text-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Chat ─────────────────────────────────────────────────────────────

function ChatScreen({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState("");

  return (
    <div className="h-full flex flex-col bg-background">
      {/* header */}
      <div className="bg-white border-b border-border px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-black text-foreground text-sm">Carlos Fernandes</p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Online agora</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Phone size={16} className="text-foreground" />
          </button>
        </div>
      </div>

      {/* pet context */}
      <div className="mx-4 mt-3 bg-primary/10 rounded-2xl p-3 flex items-center gap-3">
        <img
          src={PETS[0].image}
          alt="Thor"
          className="w-10 h-10 rounded-xl object-cover"
        />
        <div>
          <p className="text-xs text-primary font-bold">Sobre o pet: Thor</p>
          <p className="text-xs text-muted-foreground">Golden Retriever · Av. Paulista</p>
        </div>
        <ChevronRight size={14} className="text-primary ml-auto" />
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}
          >
            {msg.isLocation ? (
              <div className={cn(
                "rounded-2xl overflow-hidden shadow-sm max-w-[70%]",
                msg.sender === "me" ? "rounded-tr-sm" : "rounded-tl-sm"
              )}>
                <div className="bg-primary/10 p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                    <MapPin size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Localização compartilhada</p>
                    <p className="text-[10px] text-muted-foreground">Av. Paulista, 1000</p>
                  </div>
                </div>
                <div className="bg-[#e8f0e8] h-20 relative">
                  <svg viewBox="0 0 160 80" className="w-full h-full">
                    <rect width="160" height="80" fill="#e8f0e8" />
                    <rect x="0" y="36" width="160" height="8" fill="#f0ece4" />
                    <rect x="72" y="0" width="16" height="80" fill="#f0ece4" />
                    <circle cx="80" cy="40" r="8" fill="#FF8A3D" opacity="0.3" />
                    <circle cx="80" cy="40" r="4" fill="#FF8A3D" />
                  </svg>
                </div>
                <div className="bg-white px-3 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                  <span className="text-[10px] font-bold text-primary">Abrir no mapa</span>
                </div>
              </div>
            ) : (
              <div className={cn(
                "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm",
                msg.sender === "me"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-white text-foreground shadow-sm border border-border rounded-tl-sm"
              )}>
                <p className="leading-relaxed">{msg.text}</p>
                <p className={cn(
                  "text-[10px] mt-1",
                  msg.sender === "me" ? "text-white/60 text-right" : "text-muted-foreground"
                )}>
                  {msg.time}
                  {msg.sender === "me" && " ✓✓"}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* input */}
      <div className="bg-white border-t border-border px-4 py-3 flex items-center gap-2">
        <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <Camera size={16} className="text-muted-foreground" />
        </button>
        <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-muted-foreground" />
        </button>
        <div className="flex-1 bg-muted rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
            placeholder="Mensagem..."
          />
          <Smile size={16} className="text-muted-foreground flex-shrink-0" />
        </div>
        <button className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Alerts ───────────────────────────────────────────────────────────

function AlertsScreen({
  onPetClick,
}: {
  onPetClick: (pet: (typeof PETS)[0]) => void;
}) {
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="bg-white border-b border-border px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-foreground text-lg">Alertas</h2>
            <p className="text-xs text-muted-foreground">Pets desaparecidos próximos a você</p>
          </div>
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
              alertsEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {alertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {alertsEnabled ? "Ativo" : "Mudo"}
          </button>
        </div>

        {/* region filter */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Todos", "< 1 km", "1-3 km", "3-5 km"].map((f, i) => (
            <button
              key={f}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 flex flex-col gap-3">
        {/* urgent banner */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-red-700">Alerta urgente a 0,3 km</p>
            <p className="text-xs text-red-500">Thor desapareceu há menos de 2 horas</p>
          </div>
        </div>

        {PETS.map((pet) => (
          <button
            key={pet.id}
            onClick={() => onPetClick(pet)}
            className="bg-white rounded-3xl p-4 border border-border shadow-sm flex gap-3 text-left hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <img src={pet.image} alt={pet.name} className="w-16 h-16 rounded-2xl object-cover" />
              <div className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                pet.species === "dog" ? "bg-primary" : "bg-accent"
              )}>
                <SpeciesIcon species={pet.species} size={10} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-black text-foreground text-sm">{pet.name}</p>
                <StatusBadge status={pet.status} />
              </div>
              <p className="text-xs text-muted-foreground">{pet.breed} · {pet.color}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin size={11} className="text-primary" />
                  <span className="text-xs font-bold text-primary">{pet.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{pet.timeAgo}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{pet.lastSeen}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Directory ────────────────────────────────────────────────────────

function DirectoryScreen({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState("all");

  const icons: Record<string, React.ReactNode> = {
    clinic: <Stethoscope size={18} />,
    ong: <Heart size={18} />,
    petshop: <ShoppingBag size={18} />,
  };

  const colors: Record<string, string> = {
    clinic: "bg-orange-100 text-primary",
    ong: "bg-pink-100 text-pink-600",
    petshop: "bg-blue-100 text-accent",
  };

  const labels: Record<string, string> = {
    all: "Todos",
    clinic: "Clínicas",
    ong: "ONGs",
    petshop: "PetShops",
  };

  const filtered = filter === "all" ? DIRECTORY : DIRECTORY.filter((d) => d.type === filter);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="bg-white border-b border-border px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-foreground text-base">Diretório Pet</h2>
            <p className="text-xs text-muted-foreground">Clínicas, ONGs e Petshops</p>
          </div>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-input-background text-foreground text-sm outline-none"
            placeholder="Buscar por nome ou categoria..."
          />
        </div>
        <div className="flex gap-2 mt-3">
          {Object.keys(labels).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                filter === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {labels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 flex flex-col gap-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-4 border border-border shadow-sm flex gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", colors[item.type])}>
              {icons[item.icon]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-foreground text-sm leading-tight">{item.name}</p>
                <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-amber-500 font-bold">
                  <Star size={11} className="fill-amber-400" />
                  {item.rating}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.address}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin size={11} className="text-primary" />
                  <span className="text-xs font-bold text-primary">{item.distance}</span>
                </div>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{item.reviews} avaliações</span>
              </div>
            </div>
            <button className="self-center w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Navigation size={14} className="text-primary" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Profile ──────────────────────────────────────────────────────────

function ProfileScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-20">
      {/* hero */}
      <div className="bg-primary px-5 pt-10 pb-8 flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&auto=format"
            alt="Ana Souza"
            className="w-20 h-20 rounded-3xl object-cover border-4 border-white/30"
          />
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-md">
            <Camera size={12} className="text-white" />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-white text-lg font-black">Ana Souza</h2>
          <p className="text-white/60 text-xs">ana.souza@email.com</p>
        </div>
        {/* stats */}
        <div className="flex gap-6 mt-1">
          {[
            { value: "3", label: "Pets" },
            { value: "12", label: "Alertas" },
            { value: "8", label: "Ajudas" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-white font-black text-xl">{s.value}</p>
              <p className="text-white/60 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3">
        {/* my pets */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-foreground text-sm">Meus Pets</p>
            <button className="text-xs text-primary font-bold flex items-center gap-1">
              <Plus size={12} /> Adicionar
            </button>
          </div>
          <div className="flex gap-3">
            {PETS.slice(0, 2).map((pet) => (
              <div key={pet.id} className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2">
                <img src={pet.image} alt={pet.name} className="w-8 h-8 rounded-xl object-cover" />
                <div>
                  <p className="text-xs font-bold text-foreground">{pet.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pet.breed}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* recent alerts */}
        <div className="bg-white rounded-3xl p-4 border border-border shadow-sm">
          <p className="font-black text-foreground text-sm mb-3">Histórico de Alertas</p>
          <div className="flex flex-col gap-2">
            {[
              { text: "Thor — Alerta emitido", time: "Hoje, 14:30", color: "bg-red-500" },
              { text: "Thor — Avistado na Paulista", time: "Hoje, 15:10", color: "bg-amber-500" },
              { text: "Rex — Alerta encerrado", time: "Ontem, 09:00", color: "bg-green-500" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", a.color)} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* settings */}
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          {[
            { icon: <Bell size={16} />, label: "Notificações", color: "text-primary bg-primary/10" },
            { icon: <MapPin size={16} />, label: "Localização", color: "text-accent bg-accent/10" },
            { icon: <Settings size={16} />, label: "Configurações", color: "text-foreground bg-muted" },
            { icon: <HelpCircle size={16} />, label: "Ajuda e suporte", color: "text-green-600 bg-green-100" },
            { icon: <LogOut size={16} />, label: "Sair da conta", color: "text-red-500 bg-red-100" },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors",
                i < arr.length - 1 && "border-b border-border"
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", item.color)}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-foreground flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* app version */}
        <p className="text-center text-xs text-muted-foreground py-2">
          Miaucha v1.0.0 · Feito com ❤️ para pets e tutores
        </p>
      </div>
    </div>
  );
}

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto"
      style={{ width: 375, height: 812 }}
    >
      {/* phone shell */}
      <div
        className="absolute inset-0 rounded-[52px] bg-gray-900 shadow-2xl"
        style={{
          boxShadow: "0 50px 100px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      />
      {/* screen bezel */}
      <div className="absolute inset-[6px] rounded-[46px] bg-black overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
          <div className="w-16 h-4 rounded-full bg-gray-900" />
        </div>
        {/* status bar */}
        <div className="absolute top-2 left-0 right-0 flex items-center justify-between px-8 z-50">
          <span className="text-white text-[11px] font-semibold">9:41</span>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[2, 3, 4, 4].map((h, i) => (
                <div key={i} className="w-1 bg-white rounded-sm" style={{ height: h * 2 }} />
              ))}
            </div>
            <svg width="14" height="10" viewBox="0 0 14 10">
              <path d="M1 5C2.5 2 5 1 7 1s4.5 1 6 4c-1.5 3-4 4-6 4S2.5 8 1 5z" fill="none" stroke="white" strokeWidth="1.5" />
              <circle cx="7" cy="5" r="2" fill="white" />
            </svg>
            <div className="flex items-center gap-0.5">
              <div className="w-5 h-2.5 rounded-sm border border-white/70 p-0.5">
                <div className="w-3 h-full bg-white rounded-sm" />
              </div>
            </div>
          </div>
        </div>
        {/* content */}
        <div className="absolute inset-0 rounded-[40px] overflow-hidden font-[Nunito,sans-serif]">
          {children}
        </div>
      </div>
      {/* side buttons */}
      <div className="absolute left-[-4px] top-28 w-1.5 h-16 bg-gray-700 rounded-l-sm" />
      <div className="absolute left-[-4px] top-48 w-1.5 h-10 bg-gray-700 rounded-l-sm" />
      <div className="absolute left-[-4px] top-60 w-1.5 h-10 bg-gray-700 rounded-l-sm" />
      <div className="absolute right-[-4px] top-36 w-1.5 h-20 bg-gray-700 rounded-r-sm" />
    </div>
  );
}

// ─── Screen Selector Label ────────────────────────────────────────────────────

const SCREEN_LABELS: Record<Screen, string> = {
  splash: "Splash",
  login: "Login",
  home: "Home",
  "register-pet": "Registrar Pet",
  map: "Mapa",
  "pet-details": "Detalhes do Pet",
  chat: "Chat",
  alerts: "Alertas",
  directory: "Diretório",
  profile: "Perfil",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedPet, setSelectedPet] = useState<(typeof PETS)[0]>(PETS[0]);
  const [darkMode, setDarkMode] = useState(false);

  const mainScreens: Screen[] = ["home", "map", "alerts", "chat", "profile"];

  function handlePetClick(pet: (typeof PETS)[0]) {
    setSelectedPet(pet);
    setScreen("pet-details");
  }

  function renderScreen() {
    switch (screen) {
      case "splash":
        return <SplashScreen onNext={() => setScreen("login")} />;
      case "login":
        return <LoginScreen onNext={() => setScreen("home")} />;
      case "home":
        return (
          <HomeScreen
            onNavigate={setScreen}
            onPetClick={handlePetClick}
          />
        );
      case "register-pet":
        return <RegisterPetScreen onBack={() => setScreen("home")} />;
      case "map":
        return (
          <MapScreen
            onBack={() => setScreen("home")}
            onPetClick={handlePetClick}
          />
        );
      case "pet-details":
        return (
          <PetDetailsScreen
            pet={selectedPet}
            onBack={() => setScreen("home")}
            onChat={() => setScreen("chat")}
          />
        );
      case "chat":
        return <ChatScreen onBack={() => setScreen("pet-details")} />;
      case "alerts":
        return <AlertsScreen onPetClick={handlePetClick} />;
      case "directory":
        return <DirectoryScreen onBack={() => setScreen("home")} />;
      case "profile":
        return <ProfileScreen onNavigate={setScreen} />;
    }
  }

  const showNav = mainScreens.includes(screen);

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 gap-6 transition-colors", darkMode ? "dark bg-gray-950" : "bg-gradient-to-br from-slate-200 via-slate-100 to-blue-50")}>
      {/* header */}

      {/* screen navigation pills */}
      

      {/* phone */}
      <PhoneFrame>
        <div className={cn("w-full h-full relative", darkMode && "dark")}>
          <div className="absolute inset-0 overflow-hidden"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {renderScreen()}
            {showNav && (
              <BottomNav active={screen} onNavigate={setScreen} />
            )}
          </div>
        </div>
      </PhoneFrame>

      {/* legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 max-w-lg text-center pb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FF8A3D] inline-block" /> Laranja · Primário</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#2D6CDF] inline-block" /> Azul · Secundário</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FFD447] inline-block" /> Amarelo · Esperança</span>
        <span>Fonte: Nunito · React + Tailwind CSS</span>
      </div>
    </div>
  );
}
