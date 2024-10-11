import { CapitalizedSnakePipe } from './capitalized-snake.pipe';

describe('CapitalizedSnakePipe', () => {
  it('create an instance', () => {
    const pipe = new CapitalizedSnakePipe();
    expect(pipe).toBeTruthy();
  });
});
