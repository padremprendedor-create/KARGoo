import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Componente Button', () => {
    it('debe mostrar el texto correctamente', () => {
        render(<Button>Iniciar Viaje</Button>);
        expect(screen.getByText('Iniciar Viaje')).toBeInTheDocument();
    });

    it('debe ejecutar la función onClick cuando se presiona', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click aquí</Button>);

        fireEvent.click(screen.getByText('Click aquí'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('no debe ser clicable si está deshabilitado', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick} disabled={true}>Boton Bloqueado</Button>);

        fireEvent.click(screen.getByText('Boton Bloqueado'));
        expect(handleClick).not.toHaveBeenCalled();
    });
});
