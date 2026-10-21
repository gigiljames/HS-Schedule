export type UserRole = 'admin' | 'hs';
export type UserStatus = 'active' | 'suspended' | 'blocked';
export interface IUser {
    id: string;
    role: UserRole;
    email: string;
    displayName: string;
    username?: string;
    googleSubjectId?: string;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
}
export interface IJwtPayload {
    userId: string;
    role: UserRole;
    email: string;
}
export interface IAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: IUser;
}
export interface IAdminLoginRequest {
    username: string;
    password: string;
}
export interface IHsGoogleLoginRequest {
    idToken: string;
}
//# sourceMappingURL=auth.d.ts.map