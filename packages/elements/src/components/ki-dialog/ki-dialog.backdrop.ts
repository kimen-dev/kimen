export function isOutsideRect(_clientX: number, _clientY: number, _rect: DOMRectReadOnly): boolean {
  return (
    _clientX < _rect.left ||
    _clientX > _rect.right ||
    _clientY < _rect.top ||
    _clientY > _rect.bottom
  );
}
