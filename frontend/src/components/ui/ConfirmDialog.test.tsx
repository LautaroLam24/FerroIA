import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('llama onConfirm al confirmar y no onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        message="¿Eliminar la categoría X?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancela sin confirmar', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        message="¿Eliminar la categoría X?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('deshabilita los botones mientras confirma', () => {
    render(
      <ConfirmDialog
        open
        loading
        message="¿Eliminar la categoría X?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole('button', { name: /Confirmar/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('muestra el título y el mensaje', () => {
    render(
      <ConfirmDialog
        open
        message="¿Dar de baja a ana@test.com?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Confirmar baja')).toBeTruthy();
    expect(screen.getByText('¿Dar de baja a ana@test.com?')).toBeTruthy();
  });

  it('permite customizar título, mensaje y etiqueta de confirmación', () => {
    render(
      <ConfirmDialog
        open
        title="Eliminar categoría"
        message="Se borrará la categoría."
        confirmLabel="Sí, borrar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Eliminar categoría')).toBeTruthy();
    expect(screen.getByText('Se borrará la categoría.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sí, borrar' })).toBeTruthy();
  });
});
