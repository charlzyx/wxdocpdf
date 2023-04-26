import { chromium, devices } from 'playwright';

const clz = {
  lv1: '.NavigationLevel.NavigationLevel--level-1 .NavigationLevel__parent a',
  lv2: '.NavigationLevel.NavigationLevel--level-2 .NavigationLevel__parent a',
  lv3: '.NavigationLevel.NavigationLevel--level-2 .NavigationLevel__children a'
};


const pad = (x: number) => x < 10 ? `0${x}` : `${x}`;

const safeName = (x: string) => x ? x.replace(/\s/g, '').replace(/\//g, '-'): '';

(async () => {
  // Setup
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: {
      width: 1200,
      height: 1600
    }
  });
  const page = await context.newPage();

  // The actual interesting bit
  await context.route('**.jpg', route => route.abort());
  await page.goto('https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/');
  const locator = page.locator(clz.lv3);
  const list = await locator.evaluateAll((els) => {

    const getParent = (el: HTMLElement | null, ifif = (e: HTMLElement) => false) => {
      if (!el) return;
      if (ifif(el)) {
        return el
      }
      return getParent(el.parentElement, ifif)
    }

    return els.map(el => {
      const p1 = getParent(el.parentElement as any, (e) => e.classList.contains('NavigationLevel--level-1'));
      const p2 = getParent(el.parentElement as any, (e) => e.classList.contains('NavigationLevel--level-2'));

      return {
        href: 'https://developers.weixin.qq.com' + el.getAttribute("href"),
        title1: p1.querySelector('.NavigationLevel__parent a').innerText.trim(),
        title2: p2.querySelector('.NavigationLevel__parent a').innerText.trim(),
        title3: (el as any).innerText.trim(),
      }
    })
  })

  const unique = list.reduce((memo, item) => {
    const [link, hash] = item.href.split("#")
    if (hash && !memo.map[link]) {
      memo.lite.push(item);
      memo.map[link] = hash;
      return memo;
    } else if (!hash) {
      memo.lite.push(item)
      memo.map[link] = true;
      return memo;
    }
    return memo;

  }, { lite: [], map: {}} as any)
  const browser2 = await chromium.launch({ headless: false });
  const context2 = await browser2.newContext({
    viewport: {
      width: 960,
      height: 1600
    }
  });
  const runinng = async (items: typeof list, prefix = 0) => {
    if (items.length < 0) return;
    const wip = items.splice(0, 10);
    await Promise.all(wip.map(async (item, idx) => {
      const np = await context2.newPage();
      await np.goto(item.href!);
      await np.evaluate(() => {
        document.querySelector('.mobile-links_mobile')?.remove()
        document.querySelector('.mobile-links__wrp')?.remove()
        document.querySelector('.mobile-search-btn')?.remove()
        document.querySelector('.navbar')?.remove()
        document.querySelector('.fixed-btns')?.remove()
        document.querySelector('.subnavbar')?.remove()
        document.querySelector('.sidebar')?.remove()
        document.querySelector('.main-container')?.removeAttribute("class");
        document.querySelector('.main-container')?.setAttribute("class", 'not-at-all')
      })
      await np.pdf({
        format: 'A4',
        scale: 1,
        path: `./pdf/${pad(prefix)}-${pad(idx + 1)}-${safeName(item.title1)}-${safeName(item.title2)}-${safeName(item.title3)}.pdf`
      })
      await np.close()
    }))
    await runinng(items, prefix + 1)
  }

  await runinng(unique.lite)

  // Teardown
  // await context2.close()
  // await browser2.close()
  await context.close();
  await browser.close();
})()
