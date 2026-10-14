"""
RAG Web Crawler Service
Fetches a webpage, cleans boilerplate/tags, extracts text,
and chunks & indexes into the project-isolated vector store.
"""
import re
import logging
from typing import Dict, Any
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
from app.orchestrator.rag_service import PerProjectRAGService

logger = logging.getLogger(__name__)


class WebCrawlerService:
    """Fetches URL, sanitizes HTML, extracts textual body, and indexes into Chroma vector store"""

    @classmethod
    async def crawl_and_index_url(cls, project_id: str, url: str) -> Dict[str, Any]:
        url = url.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"

        parsed = urlparse(url)
        if not parsed.netloc:
            raise ValueError(f"Invalid URL: {url}")

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36 BFSI-Bot/1.0"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        logger.info(f"[WebCrawler] Fetching URL: {url} for project {project_id}")
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                raise RuntimeError(f"HTTP request failed with status {resp.status_code}")
            html_content = resp.text

        soup = BeautifulSoup(html_content, "html.parser")

        # Extract title
        page_title = ""
        if soup.title and soup.title.string:
            page_title = soup.title.string.strip()
        if not page_title:
            h1 = soup.find("h1")
            page_title = h1.get_text().strip() if h1 else parsed.netloc

        # Strip unneeded structural and script tags
        for tag in soup(["script", "style", "noscript", "nav", "footer", "header", "aside", "svg", "iframe", "form"]):
            tag.decompose()

        # Extract main text
        body_text = soup.get_text(separator="\n\n")

        # Clean text: remove excessive whitespace and empty lines
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in body_text.splitlines()]
        cleaned_text = "\n".join([line for line in lines if line])

        if len(cleaned_text) < 50:
            raise ValueError(f"Page content too brief or empty at URL: {url}")

        # Construct reference filename
        slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", parsed.netloc + parsed.path)[:40]
        filename = f"web_{slug}.txt"

        # Index text passages into the project's isolated Chroma collection
        chunks_count = PerProjectRAGService.index_document_text(
            project_id=project_id,
            filename=filename,
            content=cleaned_text,
            source="web_crawler",
            extra_metadata={
                "url": url,
                "title": page_title[:100],
            },
        )

        logger.info(f"[WebCrawler] Completed indexing {chunks_count} chunks for {url}")
        return {
            "url": url,
            "title": page_title,
            "filename": filename,
            "chunks_count": chunks_count,
            "char_count": len(cleaned_text),
            "snippet": cleaned_text[:300] + "..." if len(cleaned_text) > 300 else cleaned_text,
        }
