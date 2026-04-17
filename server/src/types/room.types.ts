import type { Permission } from './permission.enum.js';

export interface TransferHostResult {
  id: string;
  nickname: string;
}

export interface LeaveResult {
  hostChanged?: TransferHostResult;
  roomClosed?: boolean;
}

export interface RoomPermissionsUpdate {
  permissions: Permission[];
}
