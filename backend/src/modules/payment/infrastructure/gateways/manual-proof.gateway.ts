import { Injectable, Logger } from '@nestjs/common';
import {
  CreateChargeInput,
  CreateChargeResult,
  IPaymentGateway,
  RefundResult,
} from '../../domain/gateways/payment-gateway.interface';

/**
 * Envuelve el flujo que ya existe hoy: el cliente paga por fuera del sistema (transferencia, QR
 * bancario, Tigo Money, efectivo) y sube un comprobante que el propietario confirma a mano. No
 * hay ningun proveedor externo al que llamar, asi que no genera un link de pago ni un QR dinamico
 * -- la referencia externa es el propio pago, no algo que devuelva un tercero.
 */
@Injectable()
export class ManualProofGateway implements IPaymentGateway {
  private readonly logger = new Logger(ManualProofGateway.name);

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    return { externalReference: input.paymentId };
  }

  async refund(externalReference: string): Promise<RefundResult> {
    // Sin proveedor externo, no hay nada que este adaptador pueda revertir por su cuenta -- el
    // propietario tiene que devolver el dinero por fuera del sistema, igual que lo cobro.
    this.logger.warn(
      `Reembolso solicitado para ${externalReference}, pero el metodo manual no puede ejecutarlo automaticamente.`,
    );
    return { success: false };
  }
}
