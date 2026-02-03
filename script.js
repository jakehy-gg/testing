/** Product Image Gallery (main product slider) **/
  let productImageIndex = 0;
  let showingVariantImage = true;

  function getProductGalleryElements() {
    const mediaSection = document.querySelector('.product-card__media');
    if (!mediaSection) return null;
    const slides = mediaSection.querySelectorAll('.product-card__main-slide');
    const thumbnails = mediaSection.querySelectorAll('.product-card__thumbnail');
    return { slides, thumbnails };
  }

  function getVariantImageIndex() {
    const variantEl = document.getElementById('product-variant-image');
    const variantImg = variantEl?.querySelector('img') || variantEl?.querySelector('shopify-media')?.shadowRoot?.querySelector('img');
    const el = getProductGalleryElements();
    if (!variantImg?.src || !el?.thumbnails?.length) return 0;
    const normalize = (url) => (url || '').split('?')[0];
    const variantSrc = normalize(variantImg.src);
    for (let i = 0; i < el.thumbnails.length; i++) {
      const thumbImg = el.thumbnails[i].querySelector('img') || el.thumbnails[i].querySelector('shopify-media')?.shadowRoot?.querySelector('img');
      if (thumbImg?.src && normalize(thumbImg.src) === variantSrc) return i;
    }
    for (let i = 0; i < el.thumbnails.length; i++) {
      const thumbImg = el.thumbnails[i].querySelector('img') || el.thumbnails[i].querySelector('shopify-media')?.shadowRoot?.querySelector('img');
      if (thumbImg?.src && (thumbImg.src.includes(variantSrc) || variantSrc.includes(normalize(thumbImg.src)))) return i;
    }
    return 0;
  }

  function showVariantImage() {
    showingVariantImage = true;
    const variantEl = document.getElementById('product-variant-image');
    const el = getProductGalleryElements();
    if (variantEl) variantEl.classList.add('active');
    if (el) {
      el.slides.forEach(s => s.classList.remove('active'));
      const matchIndex = getVariantImageIndex();
      productImageIndex = matchIndex;
      el.thumbnails.forEach((t, i) => t.classList.toggle('selected', i === matchIndex));
      const thumb = el.thumbnails[matchIndex];
      if (thumb) thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  function selectProductImage(index) {
    showingVariantImage = false;
    const variantEl = document.getElementById('product-variant-image');
    if (variantEl) variantEl.classList.remove('active');
    const el = getProductGalleryElements();
    if (!el || !el.slides.length) return;
    const maxIndex = el.slides.length - 1;
    productImageIndex = Math.max(0, Math.min(index, maxIndex));

    el.slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === productImageIndex);
    });
    el.thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('selected', i === productImageIndex);
    });

    const thumb = el.thumbnails[productImageIndex];
    if (thumb) thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

    const slider = document.querySelector('.product-card__main-slider');
    if (slider) slider.classList.toggle('single-image', el.slides.length <= 1);
  }

  function selectProductImageFromThumbnail(event) {
    const thumb = event.currentTarget;
    const container = document.getElementById('product-thumbnails');
    if (!container) return;
    const thumbnails = container.querySelectorAll('.product-card__thumbnail');
    const index = Array.from(thumbnails).indexOf(thumb);
    if (index >= 0) selectProductImage(index);
  }

  function productImagePrev(event) {
    event.stopPropagation();
    const el = getProductGalleryElements();
    if (!el || !el.slides.length) return;
    const next = productImageIndex <= 0 ? el.slides.length - 1 : productImageIndex - 1;
    selectProductImage(next);
  }

  function productImageNext(event) {
    event.stopPropagation();
    const el = getProductGalleryElements();
    if (!el || !el.slides.length) return;
    const next = productImageIndex >= el.slides.length - 1 ? 0 : productImageIndex + 1;
    selectProductImage(next);
  }

  function initProductGallery() {
    const el = getProductGalleryElements();
    if (!el || !el.slides.length) return false;
    showVariantImage();
    productImageIndex = 0;
    const slider = document.querySelector('.product-card__main-slider');
    if (slider) slider.classList.toggle('single-image', el.slides.length <= 1);
    return true;
  }

  function initProductGalleryWhenReady() {
    if (initProductGallery()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      if (initProductGallery() || ++attempts >= 20) clearInterval(interval);
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initProductGalleryWhenReady();
    const productCard = document.querySelector('.product-card');
    if (productCard) {
      productCard.addEventListener('change', (e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        if (path.some(el => el instanceof Element && el.tagName?.toUpperCase() === 'SHOPIFY-VARIANT-SELECTOR')) {
          setTimeout(showVariantImage, 100);
        }
      });
      productCard.addEventListener('input', (e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        if (path.some(el => el instanceof Element && el.tagName?.toUpperCase() === 'SHOPIFY-VARIANT-SELECTOR')) {
          setTimeout(showVariantImage, 100);
        }
      });
    }
  });

  /** Cart Quantity and Add to Cart **/
  let cartQuantity = 1;
  
  function decreaseValue() {
    const countDisplay = document.querySelector('.product-card__count');
    if (cartQuantity > 1) {
      countDisplay.textContent = --cartQuantity;
    }
  }
  
  function increaseValue() {
    document.querySelector('.product-card__count').textContent = ++cartQuantity;
  }
  
  function addToCart() {
    const count = document.getElementById('product-card__count').textContent;
    const cart = document.getElementById('cart');
    for (let i = 0; i < count; i++) {
      cart.addLine(event);
    }
    cart.showModal();
  }
  
  /** Product Card Accordion **/
  function toggleAccordion(event) {
    const block = document.querySelector(event.currentTarget.dataset.toggle);
    event.currentTarget.classList.toggle('active');
    block.style.maxHeight = event.currentTarget.classList.contains('active') ? `${block.scrollHeight}px` : '';
  }
  
  /** Product Slider (You may also like section) **/
  let currentSlideIndex = 0;
  let slidesToShow = window.innerWidth <= 800 ? 3 : 4;
  
  function updateSlidesToShow() {
    slidesToShow = window.innerWidth <= 800 ? 3 : 4;
  }
  
  function moveSlider(direction) {
    const slider = document.getElementById('collection__product-slider');
    const items = slider.querySelectorAll('.collection-grid__product');
    const maxSlides = Math.max(0, items.length - slidesToShow);
    currentSlideIndex = Math.max(0, Math.min(currentSlideIndex + direction, maxSlides));
    slider.style.transform = `translateX(${currentSlideIndex * (-100 / slidesToShow)}%)`;
    document.querySelector('.collection__slider-button.prev').disabled = currentSlideIndex === 0;
    document.querySelector('.collection__slider-button.next').disabled = currentSlideIndex === maxSlides;
  }
  
  window.addEventListener('resize', () => {
    updateSlidesToShow();
    moveSlider(0);
  });
