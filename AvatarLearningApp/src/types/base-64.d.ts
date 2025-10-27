/**
 * Type declaration for base-64 package
 * Since @types/base-64 doesn't exist, we declare the module manually
 */
declare module 'base-64' {
  export function encode(str: string): string;
  export function decode(str: string): string;
}
