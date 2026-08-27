if (
  typeof window !== 'undefined' &&
  typeof window.HTMLDialogElement === 'function'
) {
  const proto = window.HTMLDialogElement.prototype;
  if (!('showModal' in proto)) {
    proto.showModal = function () {
      this.setAttribute('open', '');
    };
  }
  if (!('close' in proto)) {
    proto.close = function () {
      this.removeAttribute('open');
    };
  }
}
