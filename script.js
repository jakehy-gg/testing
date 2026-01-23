// --------------------------- FETCH PRODUCTS FROM SHOPIFY --------------------------- //

function fetchProducts() {
    return new Promise((resolve, reject) => {
        fetch("https://5xma0k-yh.myshopify.com/api/2026-01/graphql.json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": "1ffe5122d00c960e9ec5304139edbdb7"
            },
            body: JSON.stringify({
                query: `
          query AllProducts {
            products(first: 100) {
              edges {
                node {
                  id
                  title
                  handle
                  vendor
                  productType
                  tags
                  availableForSale

                  priceRange {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                    maxVariantPrice {
                      amount
                      currencyCode
                    }
                  }

                  images(first: 20) {
                    edges {
                      node {
                        url
                      }
                    }
                  }

                  metafields(identifiers: [
                    { namespace: "custom", key: "mobilefeatures" },
                    { namespace: "custom", key: "type" },
                    { namespace: "custom", key: "brand" },
                    { namespace: "custom", key: "specifications" },
                    { namespace: "custom", key: "rating" },
                    { namespace: "custom", key: "reviews" },
                    { namespace: "custom", key: "bestseller" },
                    { namespace: "custom", key: "models" },
                    { namespace: "custom", key: "features" },
                    { namespace: "custom", key: "short_description" },
                    { namespace: "custom", key: "medium_description" },
                    { namespace: "custom", key: "long_description" },
                    { namespace: "custom", key: "review_photos" },
                    { namespace: "custom", key: "specifications" },
                    { namespace: "custom", key: "date_added" }
                  ]) {
                    namespace
                    key
                    value
                    type
                  }
                }
              }
            }
          }
        `
            })
        })
            .then(res => res.json())
            .then(data => {
                const products = data.data.products.edges.map(({ node }) => {

                    const metafields = Object.fromEntries(
                        node.metafields
                            .filter(m => m !== null)
                            .map(m => {
                                let value = m.value;

                                if (m.type === "json") {
                                    try { value = JSON.parse(m.value); } catch { }
                                }

                                if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
                                    try { value = JSON.parse(value); } catch { }
                                }

                                if (Array.isArray(value) && value.length === 1) {
                                    value = value[0];
                                }

                                if (
                                    value === "" ||
                                    value === " " ||
                                    value === null ||
                                    value === undefined ||
                                    (Array.isArray(value) && value.length === 0) ||
                                    (Array.isArray(value) && value.length === 1 && String(value[0]).trim() === "")
                                ) {
                                    value = null;
                                }

                                return [m.key, value];
                            })
                    );

                    const images = node.images.edges.map(img => img.node.url);
                    const main_image = images[0] || null;
                    const thumbnail_images = images.slice(1);

                    let features = [];
                    if (metafields.features) {
                        if (Array.isArray(metafields.features)) {
                            features = metafields.features.map(f => f.trim()).filter(Boolean);
                        } else if (typeof metafields.features === "string") {
                            features = metafields.features.split("•").map(f => f.trim()).filter(Boolean);
                        }
                    }

                    let mobilefeatures = [];
                    if (metafields.mobilefeatures) {
                        if (Array.isArray(metafields.mobilefeatures)) {
                            mobilefeatures = metafields.mobilefeatures.map(f => f.trim()).filter(Boolean);
                        } else if (typeof metafields.mobilefeatures === "string") {
                            mobilefeatures = metafields.mobilefeatures.split("•").map(f => f.trim()).filter(Boolean);
                        }
                    }

                    let review_photos = [];
                    if (metafields.review_photos) {
                        if (Array.isArray(metafields.review_photos)) {
                            review_photos = metafields.review_photos.map(f => f.trim());
                        } else if (typeof metafields.review_photos === "string") {
                            review_photos = metafields.review_photos.split(",").map(f => f.trim());
                        }
                    }

                    let models = [];
                    if (metafields.models) {
                        if (Array.isArray(metafields.models)) {
                            models = metafields.models.map(m => m.trim());
                        } else if (typeof metafields.models === "string") {
                            models = metafields.models.split(",").map(m => m.trim());
                        }
                    }

                    return {
                        comment: `-----------------------------------------------${node.title.toUpperCase()}-----------------------------------------------`,
                        id: node.handle,
                        name: node.title,

                        brand: typeof metafields.brand === "string" && metafields.brand.trim() !== "" ? metafields.brand.trim() : null,
                        type: typeof metafields.type === "string" && metafields.type.trim() !== "" ? metafields.type.trim() : null,

                        models,

                        compatibility: metafields.compatibility
                            ? metafields.compatibility.split(",").map(c => c.trim())
                            : [],

                        price: parseFloat(node.priceRange.minVariantPrice.amount),
                        compare_at_price: parseFloat(node.priceRange.maxVariantPrice.amount),
                        currency: node.priceRange.minVariantPrice.currencyCode,

                        rating: parseFloat(metafields.rating),
                        reviews: parseInt(metafields.reviews),
                        bestseller: metafields.bestseller === "true",

                        features,
                        availability: node.availableForSale ? "In Stock" : "Out of Stock",
                        mobilefeatures: metafields.mobilefeatures,
                        short_description: metafields.short_description,
                        medium_description: metafields.medium_description,
                        long_description: metafields.long_description,

                        main_image,
                        thumbnail_images,
                        review_photos,

                        tags: node.tags,
                        date_added: metafields.date_added
                    };
                });

                console.log("PRODUCT OBJECTS:", products);
                window.JB_PRODUCTS = products;

                const product = window.JB_PRODUCTS[0];

                populateSlider(product);
                populateThumbnails(product);
                initProductSlider();
                populateProductInfo(product);
                populateApproxPrice(product);
                resolve(products);
            })
            .catch(err => {
                console.error("ERROR FETCHING PRODUCTS:", err);
                reject(err);
            });
    });
}


// --------------------------- PRICE CONVERSION --------------------------- //

async function convertPrice(amount, fromCurrency, toCurrency) {
    try {
        const res = await fetch(`https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`);
        const data = await res.json();
        return data.result;
    } catch (err) {
        console.error("Conversion error:", err);
        return null;
    }
}

function detectUserCurrency() {
    const locale = navigator.language || "en-GB";
    const country = locale.split("-")[1];

    const currencyMap = {
        "GB": "GBP",
        "US": "USD",
        "FR": "EUR",
        "DE": "EUR",
        "ES": "EUR",
        "IT": "EUR",
        "CA": "CAD",
        "AU": "AUD"
    };

    return currencyMap[country] || "GBP";
}

async function populateApproxPrice(product) {
  const approxEl = document.querySelector(".approx-price");
  if (!approxEl) return;

  const userCurrency = detectUserCurrency();

  if (userCurrency === "GBP") {
    approxEl.textContent = "";
    return;
  }

  const converted = await convertPrice(product.price, "GBP", userCurrency);

  if (!converted) {
    approxEl.textContent = "";
    return;
  }

  const formatted = new Intl.NumberFormat(navigator.language, {
    style: "currency",
    currency: userCurrency
  }).format(converted);

  approxEl.textContent = `${formatted} (approx)`;
}


// --------------------------- POPULATE SLIDER & THUMBNAILS --------------------------- //

function populateSlider(product) {
    const slider = document.querySelector(".mainimage-list");

    slider.innerHTML = "";

    const mainSlide = document.createElement("div");
    mainSlide.classList.add("mainimage-slide");

    const mainImg = document.createElement("img");
    mainImg.classList.add("mainimage-img");
    mainImg.src = product.main_image;

    mainSlide.appendChild(mainImg);
    slider.appendChild(mainSlide);

    product.thumbnail_images.forEach(url => {
        const slide = document.createElement("div");
        slide.classList.add("mainimage-slide");

        const img = document.createElement("img");
        img.classList.add("mainimage-img");
        img.src = url;

        slide.appendChild(img);
        slider.appendChild(slide);
    });
}

function populateThumbnails(product) {
    const list = document.querySelector(".thumbnail-list");

    list.innerHTML = "";

    const mainThumb = document.createElement("div");
    mainThumb.classList.add("thumbnail-item");

    const mainImg = document.createElement("img");
    mainImg.classList.add("thumbnail-img");
    mainImg.src = product.main_image;

    mainThumb.appendChild(mainImg);
    list.appendChild(mainThumb);

    product.thumbnail_images.forEach(url => {
        const item = document.createElement("div");
        item.classList.add("thumbnail-item");

        const img = document.createElement("img");
        img.classList.add("thumbnail-img");
        img.src = url;

        item.appendChild(img);
        list.appendChild(item);
    });
}

function populateProductInfo(product) {
  // Title
  document.querySelector(".product-title").textContent = product.name;

  // Compare-at price (formatted GBP)
  const formattedCompare = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(product.compare_at_price) + " GBP";

  document.querySelector(".product-compareprice").textContent = formattedCompare;

  const formattedGBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
}).format(product.price) + " GBP";

document.querySelector(".product-price").textContent = formattedGBP;

  // Rating + review count
  document.querySelector(".product-rating").textContent = product.rating;
  document.querySelector(".product-review-count").textContent = product.reviews;

  // Availability
  document.querySelector(".product-availability").textContent = product.availability;

  // Brand, type, models
  if (product.brand) {
    document.querySelector(".product-brand").textContent = product.brand;
  }
  if (product.type) {
    document.querySelector(".product-type").textContent = product.type;
  }
  if (product.models && product.models.length > 0) {
    document.querySelector(".product-models").textContent = product.models.join(", ");
  }

  // Descriptions
  if (product.short_description) {
    document.querySelector(".product-shortdesc").textContent = product.short_description;
  }
  if (product.medium_description) {
    document.querySelector(".product-mediumdesc").textContent = product.medium_description;
  }
  if (product.long_description) {
    document.querySelector(".product-longdesc").textContent = product.long_description;
  }

  // Features (desktop)
  if (product.features && product.features.length > 0) {
    const list = document.querySelector(".product-features");
    list.innerHTML = "";
    product.features.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });
  }

  // Mobile features
  if (product.mobilefeatures && product.mobilefeatures.length > 0) {
    const list = document.querySelector(".product-mobilefeatures");
    list.innerHTML = "";
    product.mobilefeatures.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });
  }
}


// --------------------------- PRODUCT IMAGE SLIDER FUNCTIONALITY --------------------------- //

function initProductSlider() {
    const scrollContainer = document.querySelector('.mainimage-list');
    const slides = Array.from(document.querySelectorAll('.mainimage-slide'));
    const thumbs = Array.from(document.querySelectorAll('.thumbnail-img'));

    const arrowLeft = document.querySelector('.arrow-left');
    const arrowRight = document.querySelector('.arrow-right');
    const thumbnailList = document.querySelector('.thumbnail-list');

    const thumbArrowRight = document.querySelector('.thumb-arrow-right');
    const thumbArrowLeft = document.querySelector('.thumb-arrow-left');

    if (!scrollContainer || slides.length === 0 || thumbs.length === 0) return;

    thumbs.forEach(t => t.addEventListener('dragstart', e => e.preventDefault()));

    let currentIndex = -1;

    function scrollThumbIntoView(index) {
        const thumb = thumbs[index];
        if (!thumb) return;
        thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    function setActiveThumb(index) {
        thumbs.forEach(t => t.classList.remove('active-thumb'));
        if (thumbs[index]) {
            thumbs[index].classList.add('active-thumb');
            scrollThumbIntoView(index);
        }
        currentIndex = index;
    }

    function getActiveSlideIndex() {
        const containerRect = scrollContainer.getBoundingClientRect();
        const center = containerRect.left + containerRect.width / 2;

        let closest = 0;
        let minDist = Infinity;

        slides.forEach((slide, i) => {
            const rect = slide.getBoundingClientRect();
            const slideCenter = rect.left + rect.width / 2;
            const dist = Math.abs(slideCenter - center);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        });

        return closest;
    }

    let ticking = false;
    scrollContainer.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const index = getActiveSlideIndex();
                if (index !== currentIndex) setActiveThumb(index);
                ticking = false;
            });
            ticking = true;
        }
    });

    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            slides[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            setActiveThumb(index);
        });
    });

    function scrollToSlide(index) {
        slides[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    arrowLeft?.addEventListener('click', () => {
        const current = getActiveSlideIndex();
        scrollToSlide(Math.max(0, current - 1));
    });

    arrowRight?.addEventListener('click', () => {
        const current = getActiveSlideIndex();
        scrollToSlide(Math.min(slides.length - 1, current + 1));
    });

    function updateFadeVisibility() {
        if (!thumbnailList) return;
        const maxScroll = thumbnailList.scrollWidth - thumbnailList.clientWidth;
        thumbnailList.classList.toggle('show-fade', thumbnailList.scrollLeft < maxScroll - 1);
    }

    function updateThumbArrows() {
        if (!thumbnailList) return;

        const maxScroll = thumbnailList.scrollWidth - thumbnailList.clientWidth;

        thumbArrowRight?.classList.toggle('hidden', thumbnailList.scrollLeft >= maxScroll - 1);
        thumbArrowLeft?.classList.toggle('hidden', thumbnailList.scrollLeft <= 1);
    }

    thumbnailList?.addEventListener('scroll', () => {
        updateFadeVisibility();
        updateThumbArrows();
    });

    window.addEventListener('resize', () => {
        updateFadeVisibility();
        updateThumbArrows();
    });

    updateFadeVisibility();
    updateThumbArrows();
    setActiveThumb(getActiveSlideIndex());
}

fetchProducts();


document.addEventListener('DOMContentLoaded', function () {
    const items = document.querySelectorAll('.accordion-item');

    items.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const title = item.querySelector('.accordion-title');
        const arrow = item.querySelector('.accordion-header-image');
        const icon = item.querySelector('.accordion-icon');
        const panel = item.querySelector('.accordion-panel');

        header.addEventListener('click', () => {
            const isOpen = header.classList.contains('open');

            items.forEach(i => {
                const h = i.querySelector('.accordion-header');
                const t = i.querySelector('.accordion-title');
                const a = i.querySelector('.accordion-header-image');
                const ic = i.querySelector('.accordion-icon');
                const p = i.querySelector('.accordion-panel');

                h.classList.remove('open');
                t.classList.remove('open');
                a.classList.remove('open');
                ic.classList.remove('hide');

                p.style.maxHeight = null;
                p.style.paddingTop = '0';
                p.style.paddingBottom = '0';
            });

            if (!isOpen) {
                header.classList.add('open');
                title.classList.add('open');
                arrow.classList.add('open');
                icon.classList.add('hide');

                panel.style.maxHeight = panel.scrollHeight + 'px';
            }
        });
    });
});
