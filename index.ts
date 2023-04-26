import { chromium, devices } from 'playwright';

import fs from 'fs'

const clz = {
  lv1: '.NavigationLevel.NavigationLevel--level-1 .NavigationLevel__parent a',
  lv2: '.NavigationLevel.NavigationLevel--level-2 .NavigationLevel__parent a'
};

const pad = (x: number) => x < 10 ? `0${x}` : `${x}`;

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
  const l2 = page.locator(clz.lv2);
  const list = await l2.evaluateAll((els) => {

    const getParent = (el: HTMLElement | null, ifif = (e: HTMLElement) => false) => {
      if (!el) return;
      if (ifif(el)) {
        return el
      }
      return getParent(el.parentElement, ifif)
    }

    return els.map(el => {
      const p = getParent(el.parentElement as any, (e) => e.classList.contains('NavigationLevel--level-1'));
      return {
        href: 'https://developers.weixin.qq.com' + el.getAttribute("href"),
        subTitle: (el as any).innerText.trim(),
        title: p.querySelector('.NavigationLevel__parent a').innerText.trim()
      }
    })
  })
  // const list = await page.$$eval(clz.lv1, (els) => {
  //   console.log('els', els)
  //   const ret = els.length
  //   return ret;
  // })
  const browser2 = await chromium.launch({ headless: false });
  const context2 = await browser2.newContext({
    viewport: {
      width: 800,
      height: 1600
    }
  });
  const runinng = async (items: typeof list, prefix = 0) => {
    if (items.length < 0) return;
    const wip = items.splice(0, 3);
    await Promise.all(wip.map(async (item, idx) => {
      const np = await context2.newPage();
      await np.goto(item.href!);
      await np.evaluate(() => {
        document.querySelector('.navbar')?.remove()
        document.querySelector('.subnavbar')?.remove()
        document.querySelector('.sidebar')?.remove()
      })
      await np.pdf({
        format: 'A4',
        scale: 1,
        path: `./pdf/${pad(prefix)}-${pad(idx + 1)}-${item.title}-${item.subTitle}.pdf`
      })
      await np.close()
    }))
    await runinng(items, prefix + 1)
  }

  await runinng(list)

  // console.log('list', list)


  // const pdf = await page.pdf({
  //   format: 'A4',
  //   landscape: true,
  // })

  // fs.writeFileSync('test.pdf', pdf)


  // Teardown
  await context.close();
  await browser.close();
})()
