import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/http';
import {
  fieldError,
  mapConflictField,
  mapValidationErrors,
  resolveFormError,
} from './formErrors';

describe('mapValidationErrors', () => {
  it('mapea mensajes class-validator por prefijo de propiedad', () => {
    const details = ['price must not be less than 0', 'name must not be empty'];
    expect(mapValidationErrors(details)).toEqual({
      price: 'must not be less than 0',
      name: 'must not be empty',
    });
  });

  it('devuelve vacío si details no es un array', () => {
    expect(mapValidationErrors(undefined)).toEqual({});
    expect(mapValidationErrors(null)).toEqual({});
    expect(mapValidationErrors('boom')).toEqual({});
    expect(mapValidationErrors({ a: 1 })).toEqual({});
  });

  it('ignora entradas no string y vacías', () => {
    expect(mapValidationErrors(['code must be a string', 42, '', '  '])).toEqual({
      code: 'must be a string',
    });
  });

  it('trata un mensaje sin propiedad como campo propio con mensaje genérico', () => {
    expect(mapValidationErrors(['code'])).toEqual({ code: 'Valor inválido' });
  });

  it('conserva la primera ocurrencia por campo', () => {
    expect(
      mapValidationErrors(['name must not be empty', 'name must be a string']),
    ).toEqual({ name: 'must not be empty' });
  });
});

describe('fieldError', () => {
  it('resuelve el error de un campo y undefined si no existe', () => {
    const errors = { name: 'must not be empty' };
    expect(fieldError(errors, 'name')).toBe('must not be empty');
    expect(fieldError(errors, 'code')).toBeUndefined();
    expect(fieldError(undefined, 'name')).toBeUndefined();
  });
});

describe('mapConflictField', () => {
  it('mapea 409 a campo por keyword del mensaje', () => {
    expect(mapConflictField('Ya existe un producto con ese código')).toBe('code');
    expect(mapConflictField('Ya existe una categoría con ese nombre')).toBe('name');
    expect(mapConflictField('El email ya está registrado')).toBe('email');
  });

  it('no mapea mensajes sin keyword de campo', () => {
    expect(
      mapConflictField(
        'No se puede eliminar: la categoría tiene productos asociados',
      ),
    ).toBeUndefined();
  });
});

describe('resolveFormError', () => {
  it('usa details para errores de validación 400', () => {
    const err = new ApiError(400, 'Error de validación', [
      'price must not be less than 0',
    ]);
    expect(resolveFormError(err)).toEqual({
      fieldErrors: { price: 'must not be less than 0' },
      global: undefined,
    });
  });

  it('mapea 409 a campo por keyword del mensaje', () => {
    const err = new ApiError(409, 'Ya existe un producto con ese código');
    expect(resolveFormError(err)).toEqual({
      fieldErrors: { code: 'Ya existe un producto con ese código' },
      global: undefined,
    });
  });

  it('deja 409 no mapeado como error global', () => {
    const err = new ApiError(
      409,
      'No se puede eliminar: la categoría tiene productos asociados',
    );
    expect(resolveFormError(err)).toEqual({
      fieldErrors: {},
      global: 'No se puede eliminar: la categoría tiene productos asociados',
    });
  });

  it('fallback a error inesperado si no es ApiError', () => {
    expect(resolveFormError(new Error('boom'))).toEqual({
      fieldErrors: {},
      global: 'Ocurrió un error inesperado',
    });
  });
});
