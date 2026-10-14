import asyncio
import sys

# Configure UTF-8 stdout for Windows console emoji printing
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal

from app.models import Project, ProjectConfig, Organization, KnowledgeDoc
from app.orchestrator.dynamic_graph import DynamicOrchestrator
from app.orchestrator.rag_service import PerProjectRAGService
from app.services.crawler_service import WebCrawlerService
from app.services.llm_service import llm

async def main():
    print("=== STEP 1: VERIFY OPENROUTER LLM CONNECTIVITY ===")
    test_res = llm.chat(
        system_prompt="You are a BFSI AI assistant.",
        messages=[{"role": "user", "content": "What is compound interest in one sentence?"}],
        model="google/gemini-2.0-flash-001"
    )
    print(f"OpenRouter Result: success={test_res.get('success')}, model={test_res.get('model_used')}, tokens={test_res.get('tokens_used')}, latency={test_res.get('latency_ms')}ms")
    print(f"Answer: {test_res.get('answer')}\n")
    assert test_res.get("success"), "OpenRouter LLM chat failed"

    print("=== STEP 2: VERIFY WEB CRAWLER & CHROMA VECTOR RAG ===")
    db = SessionLocal()
    proj = db.query(Project).first()
    if not proj:
        print("Creating test project...")
        org = db.query(Organization).first()
        proj = Project(
            org_id=org.id,
            name="Retail Banking Assistant",
            domain="banking",
            status="Live"
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)

    test_url = "https://httpbin.org/html"
    print(f"Crawling sample URL '{test_url}' for project {proj.id}...")
    crawl_result = await WebCrawlerService.crawl_and_index_url(proj.id, test_url)
    print(f"Crawl Result: title='{crawl_result.get('title')}', chunks_indexed={crawl_result.get('chunks_count')}")
    assert crawl_result.get("chunks_count") > 0, "Failed to index crawled chunks"

    # Also test manual document indexing
    sample_faq = (
        "BFSI Platinum Card provides 5% cashback on groceries and dining.\n\n"
        "The annual fee for Platinum Card is waived if annual spending exceeds $10,000.\n\n"
        "Foreign currency transaction fee is 0% for all premier members."
    )
    indexed_doc_chunks = PerProjectRAGService.index_document_text(
        project_id=proj.id,
        filename="platinum_card_policy.txt",
        content=sample_faq,
        source="unit_test"
    )
    print(f"Indexed sample document: {indexed_doc_chunks} chunks.")

    # Query Chroma
    query = "What is the cashback on groceries for Platinum Card?"
    print(f"Querying Chroma vector collection for '{query}'...")
    passages = PerProjectRAGService.query_project_kb(proj.id, query, top_k=2)
    print(f"Retrieved {len(passages)} passages from Chroma:")
    for p in passages:
        print(f" - [{p.get('filename')} (score: {p.get('score')})]: {p.get('text')}")
    assert len(passages) > 0, "Chroma vector retrieval returned 0 passages"

    print("\n=== STEP 3: VERIFY PLAYGROUND SIMULATION (LLM + RAG + GUARDRAILS) ===")
    orchestrator = DynamicOrchestrator(project_id=proj.id, db=db)
    playground_res = await orchestrator.process_turn(
        user_query="What cashback do I get on groceries with Platinum Card?",
        is_playground=True
    )
    print(f"Playground Answer: {playground_res['answer']}")
    print(f"Playground Telemetry: model={playground_res['model_used']}, latency={playground_res['latency_ms']}ms, tokens={playground_res['tokens_used']}")
    print(f"Retrieved RAG passages in Playground turn: {len(playground_res.get('rag_passages', []))}")
    assert "5%" in playground_res['answer'] or "cashback" in playground_res['answer'].lower(), "LLM failed to ground answer in RAG context"

    print("\n=== STEP 4: VERIFY AGENT STATUS GATING (LIVE vs PAUSED) ===")
    # Temporarily pause agent
    proj.status = "Paused"
    db.commit()
    paused_orchestrator = DynamicOrchestrator(project_id=proj.id, db=db)
    client_paused_res = await paused_orchestrator.process_turn(
        user_query="What is my balance?",
        is_playground=False
    )
    print(f"Client query to Paused agent response: {client_paused_res['answer']}")
    assert "Paused for maintenance" in client_paused_res['answer'] or "unavailable" in client_paused_res['answer'], "Paused status was not enforced"

    # Restore to Live
    proj.status = "Live"
    db.commit()
    live_orchestrator = DynamicOrchestrator(project_id=proj.id, db=db)
    client_live_res = await live_orchestrator.process_turn(
        user_query="Hello, are you available?",
        is_playground=False
    )
    print(f"Client query to Live agent response: {client_live_res['answer']}")
    assert client_live_res['intent'] != "agent_inactive", "Live agent should accept client queries"

    print("\n=== ALL 4 VERIFICATION STEPS PASSED SUCCESSFULLY ===")
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
