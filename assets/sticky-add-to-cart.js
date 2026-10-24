/**
 * <sticky-add-to-cart>
 * Mirrors the selected variant of the page's main product form and submits that form,
 * so the theme handles the add to cart exactly as it does for its own button.
 */
if (!customElements.get('sticky-add-to-cart')) {
  class StickyAddToCart extends HTMLElement {
    connectedCallback() {
      this.form = this.findProductForm();
      if (!this.form) return;

      this.submitButton = this.form.querySelector('[type="submit"]');
      this.button = this.querySelector('[data-sticky-button]');
      this.variants = JSON.parse(this.querySelector('[data-sticky-variants]').textContent);
      this.labels = { add: this.button.textContent.trim(), soldOut: 'Sold out' };

      this.button.addEventListener('click', () => this.submit());

      // Variant pickers often sit outside the form, and themes update the hidden variant
      // input after their own change handler runs, so listen on the document and read it
      // on the next frame. The bar also re-syncs every time it is shown.
      this.onChange = () => requestAnimationFrame(() => this.syncVariant());
      document.addEventListener('change', this.onChange);

      this.observer = new IntersectionObserver(([entry]) => {
        // Visible only once the main button has scrolled up out of view (not before reaching it).
        this.setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      });
      this.observer.observe(this.submitButton || this.form);

      if (this.classList.contains('sticky-atc--bottom')) document.body.classList.add('has-sticky-atc');
      this.resizeObserver = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--sticky-atc-height', `${this.offsetHeight}px`);
      });
      this.resizeObserver.observe(this);

      this.syncVariant();
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.resizeObserver?.disconnect();
      document.removeEventListener('change', this.onChange);
      document.body.classList.remove('has-sticky-atc');
    }

    findProductForm() {
      const forms = [...document.querySelectorAll('form[action*="/cart/add"]')];
      // The main form is the first one with a variant input outside of quick-add modals and drawers.
      return forms.find((form) => form.querySelector('[name="id"]') && !form.closest('dialog, [role="dialog"], modal-dialog'));
    }

    get variantId() {
      return this.form.querySelector('[name="id"]')?.value;
    }

    syncVariant() {
      const variant = this.variants[this.variantId];
      if (!variant) return;

      const variantLabel = this.querySelector('[data-sticky-variant]');
      if (variantLabel && Object.keys(this.variants).length > 1) variantLabel.textContent = variant.title;
      this.querySelector('[data-sticky-price]').textContent = variant.price;

      const image = this.querySelector('[data-sticky-image]');
      if (image && variant.image) {
        image.src = variant.image;
        image.removeAttribute('srcset');
      }

      this.button.disabled = !variant.available;
      this.button.textContent = variant.available ? this.labels.add : this.labels.soldOut;
    }

    setVisible(visible) {
      if (visible) this.syncVariant();
      this.classList.toggle('is-visible', visible);
      this.toggleAttribute('inert', !visible);
      this.setAttribute('aria-hidden', String(!visible));
    }

    submit() {
      this.button.classList.add('is-loading');
      // requestSubmit fires the theme's submit listener (AJAX cart); fall back to a normal post.
      if (typeof this.form.requestSubmit === 'function') {
        this.form.requestSubmit(this.submitButton || undefined);
      } else {
        this.form.submit();
      }
      setTimeout(() => this.button.classList.remove('is-loading'), 1200);
    }
  }

  customElements.define('sticky-add-to-cart', StickyAddToCart);
}
