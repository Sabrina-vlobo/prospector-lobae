"use client";

import { useState } from "react";
import { FollowupsToday } from "./FollowupsToday";
import { KanbanBoard } from "./KanbanBoard";
import { LeadDrawer } from "./LeadDrawer";

/**
 * Junta as peças do funil. O "lead aberto" mora aqui em cima porque tanto a lista
 * de follow-ups quanto os cards do kanban abrem o MESMO painel lateral.
 */
export function FunnelView() {
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  return (
    <>
      <FollowupsToday onOpenLead={setOpenLeadId} />
      <KanbanBoard onOpenLead={setOpenLeadId} />
      <LeadDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </>
  );
}
