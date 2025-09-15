# install with: pip install playwright
# then: playwright install

import asyncio
from playwright.async_api import async_playwright

async def scrape_linkedin_job(linkedin_url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto(linkedin_url, wait_until="domcontentloaded")
        
        # 1. Role title
        title = await page.locator("h1.topcard__title, h1.top-card-layout__title").inner_text()
        
        # 2. Company name
        company = await page.locator("a.topcard__org-name-link, a.top-card-layout__company-url").inner_text()
        
        # 3. Job description (might require expanding “see more”)
        #    First click “See more” if present:
        see_more = page.locator("button[aria-label='See more details']")
        if await see_more.count() > 0:
            await see_more.click()
        description = await page.locator("div.show-more-less-html__markup").inner_text()
        
        print("Title: ", title)
        print("Company: ", company)
        print("Description snippet: ", description[:2000], "…")
        
        await browser.close()

if __name__ == "__main__":
    url = "https://www.linkedin.com/jobs/view/4277964969/?alternateChannel=search&eBP=NON_CHARGEABLE_CHANNEL&refId=0Yzg0M4gT7nXtUAREsDt1A%3D%3D&trackingId=7pmaH%2F6XBuzRUfISKzZXvw%3D%3D&trk=d_flagship3_search_srp_jobs&lipi=urn%3Ali%3Apage%3Ad_flagship3_search_srp_jobs%3B5nD6Y259Te%2BXkCIF1JQvYw%3D%3D"
    asyncio.run(scrape_linkedin_job(url))
