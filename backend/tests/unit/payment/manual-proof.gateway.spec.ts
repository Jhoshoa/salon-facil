import { ManualProofGateway } from '../../../src/modules/payment/infrastructure/gateways/manual-proof.gateway';
import { IPaymentGateway } from '../../../src/modules/payment/domain/gateways/payment-gateway.interface';

describe('ManualProofGateway', () => {
  let gateway: IPaymentGateway;

  beforeEach(() => {
    gateway = new ManualProofGateway();
  });

  describe('createCharge', () => {
    it('returns the paymentId itself as the external reference, since there is no third party to generate one', async () => {
      const result = await gateway.createCharge({
        paymentId: 'payment-1',
        amount: 500,
        currency: 'BOB',
        description: 'Anticipo reserva',
      });

      expect(result).toEqual({ externalReference: 'payment-1' });
    });

    it('never returns a redirectUrl or qrData -- there is nothing to redirect the client to', async () => {
      const result = await gateway.createCharge({
        paymentId: 'payment-2',
        amount: 100,
        currency: 'BOB',
        description: 'Saldo restante',
      });

      expect(result.redirectUrl).toBeUndefined();
      expect(result.qrData).toBeUndefined();
    });
  });

  describe('refund', () => {
    it('reports success: false -- a manual refund can only happen outside the system', async () => {
      const result = await gateway.refund('payment-1');

      expect(result).toEqual({ success: false });
    });
  });

  it('does not implement verifyWebhookSignature -- manual confirmation is never webhook-driven', () => {
    expect(gateway.verifyWebhookSignature).toBeUndefined();
  });
});
