import { create } from 'zustand';
import { AdminUser, DiveSite, Shuttle, AdminStats, UserRole } from '@/lib/types/admin';

interface AdminState {
  // Auth state
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Users state
  users: AdminUser[];
  usersLoading: boolean;
  usersError: string | null;

  // Dive Sites state
  diveSites: DiveSite[];
  diveSitesLoading: boolean;
  diveSitesError: string | null;

  // Shuttles state
  shuttles: Shuttle[];
  shuttlesLoading: boolean;
  shuttlesError: string | null;

  // Stats state
  stats: AdminStats | null;
  statsLoading: boolean;

  // Modal states
  showUserModal: boolean;
  showDiveSiteModal: boolean;
  showShuttleModal: boolean;
  selectedItem: any | null;

  // Auth actions
  setUser: (user: AdminUser | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // User actions
  setUsers: (users: AdminUser[]) => void;
  setUsersLoading: (loading: boolean) => void;
  setUsersError: (error: string | null) => void;
  addUser: (user: AdminUser) => void;
  updateUser: (user: AdminUser) => void;
  deleteUser: (userId: string) => void;

  // Dive Site actions
  setDiveSites: (sites: DiveSite[]) => void;
  setDiveSitesLoading: (loading: boolean) => void;
  setDiveSitesError: (error: string | null) => void;
  addDiveSite: (site: DiveSite) => void;
  updateDiveSite: (site: DiveSite) => void;
  deleteDiveSite: (siteId: string) => void;

  // Shuttle actions
  setShuttles: (shuttles: Shuttle[]) => void;
  setShuttlesLoading: (loading: boolean) => void;
  setShuttlesError: (error: string | null) => void;
  addShuttle: (shuttle: Shuttle) => void;
  updateShuttle: (shuttle: Shuttle) => void;
  deleteShuttle: (shuttleId: string) => void;

  // Stats actions
  setStats: (stats: AdminStats) => void;
  setStatsLoading: (loading: boolean) => void;

  // Modal actions
  openUserModal: (user?: AdminUser) => void;
  closeUserModal: () => void;
  openDiveSiteModal: (site?: DiveSite) => void;
  closeDiveSiteModal: () => void;
  openShuttleModal: (shuttle?: Shuttle) => void;
  closeShuttleModal: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  // Initial auth state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initial users state
  users: [],
  usersLoading: false,
  usersError: null,

  // Initial dive sites state
  diveSites: [],
  diveSitesLoading: false,
  diveSitesError: null,

  // Initial shuttles state
  shuttles: [],
  shuttlesLoading: false,
  shuttlesError: null,

  // Initial stats state
  stats: null,
  statsLoading: false,

  // Initial modal states
  showUserModal: false,
  showDiveSiteModal: false,
  showShuttleModal: false,
  selectedItem: null,

  // Auth actions
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      users: [],
      diveSites: [],
      shuttles: [],
      stats: null,
      error: null,
    }),

  // User actions
  setUsers: (users) => set({ users }),
  setUsersLoading: (usersLoading) => set({ usersLoading }),
  setUsersError: (usersError) => set({ usersError }),
  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),
  updateUser: (user) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? user : u)),
    })),
  deleteUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),

  // Dive Site actions
  setDiveSites: (diveSites) => set({ diveSites }),
  setDiveSitesLoading: (diveSitesLoading) => set({ diveSitesLoading }),
  setDiveSitesError: (diveSitesError) => set({ diveSitesError }),
  addDiveSite: (site) =>
    set((state) => ({
      diveSites: [...state.diveSites, site],
    })),
  updateDiveSite: (site) =>
    set((state) => ({
      diveSites: state.diveSites.map((s) => (s.id === site.id ? site : s)),
    })),
  deleteDiveSite: (siteId) =>
    set((state) => ({
      diveSites: state.diveSites.filter((s) => s.id !== siteId),
    })),

  // Shuttle actions
  setShuttles: (shuttles) => set({ shuttles }),
  setShuttlesLoading: (shuttlesLoading) => set({ shuttlesLoading }),
  setShuttlesError: (shuttlesError) => set({ shuttlesError }),
  addShuttle: (shuttle) =>
    set((state) => ({
      shuttles: [...state.shuttles, shuttle],
    })),
  updateShuttle: (shuttle) =>
    set((state) => ({
      shuttles: state.shuttles.map((s) => (s.id === shuttle.id ? shuttle : s)),
    })),
  deleteShuttle: (shuttleId) =>
    set((state) => ({
      shuttles: state.shuttles.filter((s) => s.id !== shuttleId),
    })),

  // Stats actions
  setStats: (stats) => set({ stats }),
  setStatsLoading: (statsLoading) => set({ statsLoading }),

  // Modal actions
  openUserModal: (user?) =>
    set({
      showUserModal: true,
      selectedItem: user || null,
    }),
  closeUserModal: () =>
    set({
      showUserModal: false,
      selectedItem: null,
    }),
  openDiveSiteModal: (site?) =>
    set({
      showDiveSiteModal: true,
      selectedItem: site || null,
    }),
  closeDiveSiteModal: () =>
    set({
      showDiveSiteModal: false,
      selectedItem: null,
    }),
  openShuttleModal: (shuttle?) =>
    set({
      showShuttleModal: true,
      selectedItem: shuttle || null,
    }),
  closeShuttleModal: () =>
    set({
      showShuttleModal: false,
      selectedItem: null,
    }),
}));
