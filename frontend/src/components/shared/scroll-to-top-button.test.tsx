import { act, fireEvent, render, screen } from '@testing-library/react';
import { ScrollToTopButton } from './scroll-to-top-button';

const setScrollY = (value: number) => {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true });
};

beforeEach(() => {
  setScrollY(0);
  window.scrollTo = jest.fn();
});

describe('ScrollToTopButton', () => {
  it('no se muestra mientras no se bajo lo suficiente', () => {
    render(<ScrollToTopButton />);

    expect(screen.queryByRole('button', { name: 'Volver arriba' })).not.toBeInTheDocument();
  });

  it('aparece despues de bajar aproximadamente una pantalla de scroll', () => {
    render(<ScrollToTopButton />);

    act(() => {
      setScrollY(window.innerHeight + 100);
      fireEvent.scroll(window);
    });

    expect(screen.getByRole('button', { name: 'Volver arriba' })).toBeInTheDocument();
  });

  it('al tocarlo, sube hasta arriba del todo con scroll suave', () => {
    render(<ScrollToTopButton />);

    act(() => {
      setScrollY(window.innerHeight + 100);
      fireEvent.scroll(window);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Volver arriba' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('vuelve a ocultarse si se sube de nuevo por encima del umbral', () => {
    render(<ScrollToTopButton />);

    act(() => {
      setScrollY(window.innerHeight + 100);
      fireEvent.scroll(window);
    });
    expect(screen.getByRole('button', { name: 'Volver arriba' })).toBeInTheDocument();

    act(() => {
      setScrollY(0);
      fireEvent.scroll(window);
    });
    expect(screen.queryByRole('button', { name: 'Volver arriba' })).not.toBeInTheDocument();
  });
});
