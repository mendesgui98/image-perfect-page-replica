type DatabaseError = { code?: string; message?: string };
export const trashUnavailableMessage =
  "A lixeira ainda não foi ativada no banco deste projeto. É necessário concluir a atualização do banco para excluir ou restaurar registros.";

export function recordDeletionErrorMessage(error: DatabaseError): string {
  const message = error.message ?? "";
  const missingFunction = error.code === "PGRST202" && message.includes("manage_record_deletion");
  const missingTrashColumn =
    ["42703", "PGRST204"].includes(error.code ?? "") && /deleted_at|deleted_by/.test(message);
  if (missingFunction || missingTrashColumn) return trashUnavailableMessage;
  return message || "Não foi possível concluir a operação. Tente novamente.";
}
