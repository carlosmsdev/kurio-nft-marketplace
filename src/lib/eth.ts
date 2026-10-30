const SCALE = 10n ** 18n;
export function toWei(value: string): bigint {
    if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value))
        throw new Error('Valor ETH inválido');
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, '0') || '0');
}
export function fromWei(value: bigint): string {
    const whole = value / SCALE;
    const fraction = (value % SCALE).toString().padStart(18, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : `${whole}`;
}
export const eth = (value: string): string => `${value} ETH`;

