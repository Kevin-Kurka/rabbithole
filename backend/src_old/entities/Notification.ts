// Notification entity - represents a user notification
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  related_user_id?: string;
  metadata?: any;
  read: boolean;
  created_at: Date;
  updated_at?: Date;
}
