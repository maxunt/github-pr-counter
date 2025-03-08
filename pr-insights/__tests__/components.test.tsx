import React from 'react';
import { render, screen } from '@testing-library/react';

// A simple component to test
const TestComponent = () => <div>Test Component</div>;

describe('Basic Component Tests', () => {
  it('can render a simple component', () => {
    render(<TestComponent />);
    const element = screen.getByText('Test Component');
    expect(element).toBeInTheDocument();
  });

  it('can use basic matchers', () => {
    // Basic Jest assertions
    expect(1 + 1).toBe(2);
    expect({ name: 'test' }).toEqual({ name: 'test' });
    expect([1, 2, 3]).toContain(2);
  });
}); 