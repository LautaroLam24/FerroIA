import { useState } from 'react';
import { StockEntryForm } from './StockEntryForm';
import { StockSaleForm } from './StockSaleForm';
import { MovementsPage } from './MovementsPage';

export function StockPage() {
  const [refreshToken, setRefreshToken] = useState(0);
  const bumpRefresh = () => setRefreshToken((token) => token + 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <StockEntryForm onSuccess={bumpRefresh} />
        <StockSaleForm onSuccess={bumpRefresh} />
      </div>
      <MovementsPage key={refreshToken} />
    </div>
  );
}
