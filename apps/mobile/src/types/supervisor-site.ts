export interface SupervisorSiteItem {
  id: string;
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
