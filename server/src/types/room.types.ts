export interface TransferHostResult {
  id: string;
  nickname: string;
}

export interface LeaveResult {
  hostChanged?: TransferHostResult;
  roomClosed?: boolean;
}
