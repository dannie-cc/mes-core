export interface IUser {
    readonly id: string;
    readonly email: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly isVerified: boolean;
}
