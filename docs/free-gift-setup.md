# Free gift above a cart value: setup

The offer has two parts. Both are needed.

| Part | Responsible for |
|---|---|
| Automatic discount (Shopify admin) | Making the gift free. Enforced by Shopify at checkout. |
| `free-gift-threshold` snippet + script | Putting the gift in the cart and taking it out again. |

## 1. Gift product

1. Create a product for the gift, e.g. **Free tote bag** (`free-tote-bag`), with its real price.
2. Make it available on the Online Store channel, and keep inventory tracked if stock is limited.
   When it runs out, the snippet stops outputting the script.
3. Hide it from collections and search if you don't want it sold on its own.

## 2. Automatic discount

**Discounts → Create discount → Buy X get Y**

| Setting | Value |
|---|---|
| Method | Automatic discount |
| Customer buys | Minimum purchase amount, e.g. 5,000. Any items from all products. |
| Customer gets | Quantity 1, the gift product |
| At a discounted value | Free |
| Maximum uses per order | 1 |
| Combinations | Allow combining with product / order discounts if other offers should still apply |

The discount checks the threshold again on the server, so a cart that drops below it can't keep the gift free.

## 3. Theme

In `layout/theme.liquid`, just before `</body>`:

```liquid
{% render 'free-gift-threshold', gift_handle: 'free-tote-bag', threshold: 5000 %}
```

`threshold` is in the store's default currency, in major units, and must match the discount's
minimum purchase amount.

### Non-Dawn themes

After the script adds or removes the gift, it re-renders parts of the page through the
[Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering).
The default is Dawn's cart drawer and cart icon:

```liquid
{% render 'free-gift-threshold',
  gift_handle: 'free-tote-bag',
  threshold: 5000,
  refresh_sections: 'cart-drawer:#CartDrawer,cart-icon-bubble:#cart-icon-bubble'
%}
```

Each entry is `section-id:#css-selector`. Use the section file name of your theme's drawer and
cart count, and a selector that exists both on the page and in the section's HTML. On the cart
page itself, the page reloads.

The script also fires `free-gift:cart-updated` on `document`, so you can hook any extra UI work to that event.

## 4. Test checklist

- [ ] Add products below the threshold: no gift.
- [ ] Cross the threshold: the gift appears once, at 0.
- [ ] Increase the gift's quantity: it goes back to 1.
- [ ] Drop below the threshold: the gift is removed.
- [ ] Remove the gift while still above the threshold: it does not come back.
- [ ] Empty the cart and start again: the gift is offered again.
- [ ] Check the cart page, the drawer and checkout (the discount line shows the gift as free).
- [ ] Switch currency, if the store sells in several: the threshold still behaves.
