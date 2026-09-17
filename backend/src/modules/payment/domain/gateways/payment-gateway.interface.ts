export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CreateChargeInput {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface CreateChargeResult {
  externalReference: string;
  redirectUrl?: string;
  qrData?: string;
}

export interface RefundResult {
  success: boolean;
}

/**
 * Puerto que el dominio de pagos usa para arrancar un cobro y pedir un reembolso, sin depender
 * de un proveedor concreto. `ManualProofGateway` es el adaptador de hoy (comprobante + confirma-
 * cion a mano); un proveedor real (ej. Libelula) implementa el mismo contrato.
 */
export interface IPaymentGateway {
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;

  /** Solo lo implementan proveedores con confirmacion automatica via webhook. El adaptador
   * manual no lo define -- la confirmacion sigue siendo un click del propietario. */
  verifyWebhookSignature?(payload: unknown, signature: string): boolean;

  refund(externalReference: string, amount?: number): Promise<RefundResult>;
}
