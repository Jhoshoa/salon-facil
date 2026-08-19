import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod, PaymentType } from '../../domain/entities/payment.entity';

export class CreatePaymentDto {
  @IsEnum(PaymentType, { message: 'Tipo de pago no valido' })
  paymentType!: PaymentType;

  @IsEnum(PaymentMethod, { message: 'Metodo de pago no valido' })
  method!: PaymentMethod;

  @IsNumber({}, { message: 'El monto debe ser numerico' })
  @Min(1, { message: 'El monto debe ser mayor a cero' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectPaymentDto {
  @IsString({ message: 'El motivo es requerido' })
  @MaxLength(1000)
  reason!: string;
}
