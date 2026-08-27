import { useEffect, useState, type FormEvent } from 'react';
import {
  createStockEntry,
  listProducts,
  type ApiProduct,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { resolveFormError } from '../../components/ui/formErrors';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/useToast';

interface StockEntryFormProps {
  onSuccess?: () => void;
}

export function StockEntryForm({ onSuccess }: StockEntryFormProps) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    try {
      await createStockEntry({
        productId,
        quantity: Number(quantity),
        reason,
      });
      showToast('Entrada registrada correctamente', 'success');
      setQuantity('');
      setReason('');
      onSuccess?.();
    } catch (err) {
      const resolved = resolveFormError(err);
      showToast(
        resolved.global ?? 'No se pudo registrar la entrada',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-text">Registrar entrada</h3>
      <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <FormField label="Producto" htmlFor="entry-product" required>
          <Select
            id="entry-product"
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
        <FormField label="Cantidad" htmlFor="entry-quantity" required>
          <Input
            id="entry-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Motivo" htmlFor="entry-reason" required>
          <Input
            id="entry-reason"
            name="reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </FormField>
        <Button type="submit" loading={submitting}>
          {submitting ? 'Registrando…' : 'Registrar entrada'}
        </Button>
      </form>
    </Card>
  );
}
