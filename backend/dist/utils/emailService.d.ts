export declare function sendOtpEmail(to: string, otp: string, purpose?: 'forgot' | 'verify'): Promise<{
    success: boolean;
    provider: string;
    previewUrl?: string;
}>;
//# sourceMappingURL=emailService.d.ts.map