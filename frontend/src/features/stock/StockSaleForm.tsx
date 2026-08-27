import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  createStockSale,
  listProducts,
  type ApiProduct,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import {
  fieldError,
  resolveFormError,
  type FieldErrors,
} from '../../components/ui/formErrors';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/useToast';

interface StockSaleFormProps {
  onSuccess?: () => void;
}

export function StockSaleForm({ onSuccess }: StockSaleFormProps) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    listProducts({ pageSize: 100 })
      .then((result) => setProducts(result.data))
      .catch((err: unknown) => {
        showToast(
          resolveFormError(err).global ?? 'No se pudieron cargar los productos',
          'error',
        );
      });
  }, [showToast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await createStockSale({ productId, quantity: Number(quantity) });
      showToast('Venta registrada correctamente', 'success');
      setQuantity('');
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.message === 'Stock insuficiente') {
        setFieldErrors({ quantity: 'Stock insuficiente' });
      } else {
        const resolved = resolveFormError(err);
        setFieldErrors(resolved.fieldErrors);
        if (resolved.global) {
          setFormError(resolved.global);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const quantityError = fieldError(fieldErrors, 'quantity');

  return (
    <Card>
      <h3 className="text-lg font-semibold text-text">Registrar venta</h3>
      <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <FormField label="Producto" htmlFor="sale-product" required>
          <Select
            id="sale-product"
            name="productId"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
          >
            <option value="" disabled>
              Seleccionar producto
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Cantidad" htmlFor="sale-quantity" error={quantityError} required>
          <Input
            id="sale-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </FormField>
        {formError && <p role="alert">{formError}</p>}
        <Button type="submit" loading={submitting}>
          {submitting ? 'Registrando…' : 'Registrar venta'}
        </Button>
      </form>
    </Card>
  );
}
