describe('Simple Tests', () => {
  it('adds numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('can work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('can work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
    expect(obj.name).toBe('test');
  });
}); 