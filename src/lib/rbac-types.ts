// RBAC Type Definitions

export type Page = {
	PageId: number;
	PageKey: string;
	PageName: string;
	RoutePath: string;
	SectionKey: string | null;
	SortOrder: number | null;
	IsActive: boolean;
	CreatedAt: Date | null;
};

export type Role = {
	RoleId: number;
	RoleName: string;
	RoleDescription: string | null;
	IsActive: boolean;
	CreatedAt: Date | null;
};

export type Permission = {
	PermissionId: number;
	PermKey: string;
	PageId: number;
	ActionKey: string;
	IsActive: boolean;
	CreatedAt: Date | null;
	// Joined data
	PageKey?: string;
	PageName?: string;
	RoutePath?: string;
};

export type RolePermission = {
	RoleId: number;
	PermissionId: number;
	IsAllowed: boolean;
	GrantedAt: Date | null;
	// Joined data
	PermKey?: string;
	ActionKey?: string;
	PageId?: number;
	PageKey?: string;
	PageName?: string;
};

export type UserRole = {
	UserId: number | string;
	RoleId: number;
	AssignedAt: Date | null;
	// Joined data
	RoleName?: string;
	RoleDescription?: string;
};

export type UserPermission = {
	UserId: number | string;
	PermissionId: number;
	IsAllowed: boolean;
	AssignedAt: Date | null;
	// Joined data
	PermKey?: string;
	ActionKey?: string;
	PageId?: number;
};

export type User = {
	UserId: number;
	email_address: string;
	UserFullName: string | null;
	UserType: string | null;
	Designation: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	user_create_date: Date | null;
	user_update_date: Date | null;
	AccessScope: string | null;
};

export type UserWithRoles = User & {
	roles?: Role[];
	userPermissions?: UserPermission[];
};
