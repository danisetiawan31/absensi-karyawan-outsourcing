export interface SupervisorSiteItem {
  id: string;
  supervisor: {
    id: string;
    nama: string;
    email: string;
  };
  site: {
    id: string;
    nama: string;
    alamat: string;
  };
}

export interface CreateSupervisorSitePayload {
  supervisorId: string;
  siteId: string;
}
