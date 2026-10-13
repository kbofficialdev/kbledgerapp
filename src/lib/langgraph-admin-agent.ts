import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { askGeminiAssistant } from "@/lib/gemini";
import {
  executeAdminAgentTool,
  detectRequestedToolsFromPrompt,
  AgentArtifact,
  AgentToolStep,
} from "@/lib/admin-ai-tools";

export interface LangGraphNodeTrace {
  node: string;
  label: string;
  framework: string;
  durationMs: number;
  detail: string;
}

export interface StoreMetricsSnapshot {
  totalVillages: number;
  totalCustomers: number;
  totalOutstandingUdhaar: number;
  totalOrders: number;
  openTickets: number;
}

/**
 * Build the 9 official LangChain DynamicStructuredTools with Zod schemas
 */
export function createLangChainStoreTools(
  onToolCompleted: (step: AgentToolStep, artifact?: AgentArtifact, markdownSummary?: string) => void
) {
  const pdfTool = new DynamicStructuredTool({
    name: "generate_pdf_report",
    description:
      "Generate an official downloadable PDF report (STORE_LEDGER, CUSTOMER_STATEMENT, or DEBT_RECOVERY_PLAN) from live PostgreSQL records.",
    schema: z.object({
      reportType: z
        .enum(["STORE_LEDGER", "CUSTOMER_STATEMENT", "DEBT_RECOVERY_PLAN"])
        .default("STORE_LEDGER")
        .describe("Type of PDF report to generate"),
      customerQuery: z.string().optional().describe("Optional customer name, mobile, or code"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("generate_pdf_report", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const excelTool = new DynamicStructuredTool({
    name: "generate_excel_sheet",
    description:
      "Generate a downloadable multi-sheet Excel (.xlsx) workbook containing customer balances, village exposure, orders, and payment logs.",
    schema: z.object({
      sheetType: z
        .enum(["FULL_WORKBOOK", "DEBTORS_SHEET", "ORDERS_EXPORT"])
        .default("FULL_WORKBOOK")
        .describe("Type of Excel workbook to export"),
      villageQuery: z.string().optional().describe("Optional village name or code filter"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("generate_excel_sheet", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const visualImageTool = new DynamicStructuredTool({
    name: "generate_visual_image",
    description:
      "Generate a high-resolution visual chart, financial infographic, or promotional store poster image for inline display and download.",
    schema: z.object({
      visualType: z
        .enum(["VILLAGE_DEBT_CHART", "FINANCIAL_INFOGRAPHIC", "PROMO_POSTER"])
        .default("VILLAGE_DEBT_CHART")
        .describe("Type of visual graphic to render"),
      headline: z.string().optional().describe("Custom headline for the chart or poster"),
      subtext: z.string().optional().describe("Optional subtitle or promotional copy"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("generate_visual_image", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const emailTool = new DynamicStructuredTool({
    name: "draft_and_send_email",
    description:
      "Draft and send an official store email (payment reminder, statement, or custom notice) via Nodemailer SMTP to a customer or email address.",
    schema: z.object({
      recipientQuery: z
        .string()
        .describe("Customer name, mobile, customerCode, or direct email address"),
      subject: z.string().optional().describe("Custom email subject line"),
      messageBody: z.string().optional().describe("Custom email body text"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("draft_and_send_email", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const createVillageTool = new DynamicStructuredTool({
    name: "create_village",
    description: "Create or update a village territory in the PostgreSQL database.",
    schema: z.object({
      name: z.string().describe("Village name (e.g., Rampur)"),
      code: z.string().optional().describe("Unique short code (e.g., VIL-RMP)"),
      taluk: z.string().optional().describe("Taluk or Mandal name"),
      district: z.string().optional().describe("District name"),
      pincode: z.string().optional().describe("6-digit pincode"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("create_village", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const registerCustomerTool = new DynamicStructuredTool({
    name: "register_customer",
    description:
      "Register a new customer account in the PostgreSQL ledger under a village territory and optionally dispatch a welcome email.",
    schema: z.object({
      name: z.string().describe("Full name of the customer"),
      mobile: z.string().describe("10-digit mobile number"),
      email: z.string().optional().describe("Optional email address for OTP login & notifications"),
      villageName: z.string().optional().describe("Village name or code"),
      creditLimit: z.number().optional().describe("Maximum Udhaar credit limit in INR"),
      openingBalance: z.number().optional().describe("Initial opening Udhaar balance in INR"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("register_customer", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const createOrderBillTool = new DynamicStructuredTool({
    name: "create_order_bill",
    description:
      "Create a new store order / bill for a customer with itemized lines and automatic ledger balance update (DEBIT, CREDIT, or PARTIAL).",
    schema: z.object({
      customerQuery: z.string().describe("Customer name, mobile number, or customerCode"),
      itemName: z.string().describe("Name of item purchased"),
      quantity: z.number().default(1).describe("Quantity purchased"),
      unit: z.string().default("pcs").describe("Unit (pcs, bag, kg, pkt, box)"),
      pricePerUnit: z.number().describe("Price per unit in INR"),
      paymentType: z
        .enum(["DEBIT", "CREDIT", "PARTIAL"])
        .default("CREDIT")
        .describe("Payment mode: DEBIT (Nagathu), CREDIT (Udhaar), or PARTIAL"),
      paidAmount: z.number().optional().describe("Amount paid on the spot if PARTIAL"),
      notes: z.string().optional().describe("Optional billing note"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("create_order_bill", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const recordPaymentTool = new DynamicStructuredTool({
    name: "record_payment",
    description:
      "Record a payment collection from a customer to settle their outstanding Udhaar balance and update the ledger.",
    schema: z.object({
      customerQuery: z.string().describe("Customer name, mobile number, or customerCode"),
      amount: z.number().describe("Payment amount received in INR"),
      method: z.enum(["CASH", "GPAY", "DYNAMIC_QR"]).default("CASH").describe("Payment method"),
      notes: z.string().optional().describe("Optional collection note"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("record_payment", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  const manageSupportTicketTool = new DynamicStructuredTool({
    name: "manage_support_ticket",
    description: "Reply to and update the status of a customer support ticket in the database.",
    schema: z.object({
      ticketQuery: z.string().default("LATEST").describe("Ticket number or LATEST"),
      replyMessage: z.string().describe("Official administrator reply message"),
      newStatus: z
        .enum(["IN_PROGRESS", "RESOLVED", "CLOSED"])
        .default("RESOLVED")
        .describe("New ticket status"),
    }),
    func: async (input) => {
      const res = await executeAdminAgentTool("manage_support_ticket", input);
      onToolCompleted(res.step, res.artifact, res.markdownSummary);
      return res.step.summary;
    },
  });

  return [
    pdfTool,
    excelTool,
    visualImageTool,
    emailTool,
    createVillageTool,
    registerCustomerTool,
    createOrderBillTool,
    recordPaymentTool,
    manageSupportTicketTool,
  ];
}

export async function fetchLiveStoreSnapshot() {
  const [
    totalVillages,
    villagesList,
    totalCustomers,
    topDebtors,
    allCustomers,
    recentOrders,
    recentPayments,
    totalOrders,
    openTickets,
  ] = await Promise.all([
    prisma.village.count({ where: { isActive: true } }),
    prisma.village.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, taluk: true, district: true },
      take: 25,
    }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { currentBalance: "desc" },
      take: 10,
      include: { village: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      select: { currentBalance: true, creditLimit: true, villageId: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        customer: { select: { name: true } },
        village: { select: { name: true } },
        items: { select: { name: true, quantity: true, unit: true, lineTotal: true } },
      },
    }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    prisma.order.count(),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
  ]);

  let totalOutstandingUdhaar = 0;
  for (const c of allCustomers) {
    totalOutstandingUdhaar += Number(c.currentBalance);
  }

  const villageDebtMap = new Map<string, number>();
  for (const c of allCustomers) {
    const current = villageDebtMap.get(c.villageId) || 0;
    villageDebtMap.set(c.villageId, current + Number(c.currentBalance));
  }

  const villageSummary = villagesList.map((v) => {
    const debt = villageDebtMap.get(v.id) || 0;
    return `- ${v.name} (${v.code}, ${v.taluk || "Tandoor"}): Total Udhaar ₹${debt.toFixed(2)}`;
  });

  const debtorSummary = topDebtors.map(
    (d) =>
      `- ${d.name} (${d.customerCode}, ${d.village.name}): Balance ₹${Number(d.currentBalance).toFixed(2)} | Mobile: ${d.mobile} | Email: ${d.email || "N/A"}`
  );

  const recentOrderSummary = recentOrders.map(
    (o) =>
      `- #${o.orderNumber} for ${o.customer.name} (${o.village.name}): ₹${Number(o.totalAmount).toFixed(2)} [${o.paymentType}] Items: ${o.items.map((i) => `${i.name} (${Number(i.quantity)} ${i.unit})`).join(", ")}`
  );

  const recentPaymentSummary = recentPayments.map(
    (p) =>
      `- Ref ${p.paymentRef} from ${p.customer.name}: ₹${Number(p.amount).toFixed(2)} via ${p.method} [Status: ${p.status}]`
  );

  const dbContextSummary = `
STORE OVERVIEW:
- Total Active Villages: ${totalVillages}
- Total Active Customers: ${totalCustomers}
- Total Lifetime Orders: ${totalOrders}
- Open Support Tickets: ${openTickets}
- Total Outstanding Udhaar Across All Village Ledgers: ₹${totalOutstandingUdhaar.toFixed(2)}

CUSTOMER ACCOUNTS & BALANCES:
${debtorSummary.join("\n") || "No customers registered."}

VILLAGE TERRITORIES & EXPOSURE:
${villageSummary.join("\n") || "No villages configured."}

RECENT STORE ORDERS:
${recentOrderSummary.join("\n") || "No recent orders."}

RECENT PAYMENTS & SETTLEMENTS:
${recentPaymentSummary.join("\n") || "No recent payments recorded."}
`;

  return {
    metrics: {
      totalVillages,
      totalCustomers,
      totalOutstandingUdhaar,
      totalOrders,
      openTickets,
    },
    villagesList,
    topDebtors,
    dbContextSummary,
  };
}

/**
 * Define the LangGraph State Annotation for the KB Store Admin Autonomous Agent
 */
const AdminAgentState = Annotation.Root({
  prompt: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  conversationHistory: Annotation<Array<{ role: string; content: string }>>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  image: Annotation<{ data: string; mimeType: string } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  explicitToolAction: Annotation<{ toolName: string; args: Record<string, any> } | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  dbContextSummary: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  metrics: Annotation<StoreMetricsSnapshot>({
    reducer: (_, next) => next,
    default: () => ({
      totalVillages: 0,
      totalCustomers: 0,
      totalOutstandingUdhaar: 0,
      totalOrders: 0,
      openTickets: 0,
    }),
  }),
  plannedToolCalls: Annotation<Array<{ toolName: string; args: Record<string, any> }>>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  toolSteps: Annotation<AgentToolStep[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  artifacts: Annotation<AgentArtifact[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  toolMarkdownBlocks: Annotation<string[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  graphTrace: Annotation<LangGraphNodeTrace[]>({
    reducer: (curr, next) => [...curr, ...next],
    default: () => [],
  }),
  finalAnswer: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

/**
 * Run the compiled LangGraph StateGraph Autonomous Agent powered by LangChain ChatGoogleGenerativeAI (Gemini Brain)
 */
export async function runLangGraphAdminAgent(params: {
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  image?: { data: string; mimeType: string };
  toolAction?: { toolName: string; args: Record<string, any> };
}) {
  const collectedSteps: AgentToolStep[] = [];
  const collectedArtifacts: AgentArtifact[] = [];
  const collectedMarkdown: string[] = [];

  const langchainTools = createLangChainStoreTools((step, artifact, markdownSummary) => {
    collectedSteps.push(step);
    if (artifact) collectedArtifacts.push(artifact);
    if (markdownSummary) collectedMarkdown.push(markdownSummary);
  });

  const toolsByName = new Map<string, any>();
  for (const t of langchainTools) {
    toolsByName.set(t.name, t);
  }

  // NODE 1: PostgreSQL Context Retriever Node
  const contextLoaderNode = async (state: typeof AdminAgentState.State) => {
    const t0 = Date.now();
    const snapshot = await fetchLiveStoreSnapshot();
    return {
      dbContextSummary: snapshot.dbContextSummary,
      metrics: snapshot.metrics,
      graphTrace: [
        {
          node: "context_loader_node",
          label: "PostgreSQL Context Retriever",
          framework: "LangGraph StateNode",
          durationMs: Date.now() - t0,
          detail: `Loaded ${snapshot.metrics.totalVillages} villages, ${snapshot.metrics.totalCustomers} customers, ₹${snapshot.metrics.totalOutstandingUdhaar.toLocaleString("en-IN")} Udhaar`,
        },
      ],
    };
  };

  // NODE 2: LangChain ChatGoogleGenerativeAI Planner & Tool-Binding Brain Node
  const agentPlannerNode = async (state: typeof AdminAgentState.State) => {
    const t0 = Date.now();

    // First check deterministic intent or explicit UI action
    let planned = detectRequestedToolsFromPrompt(state.prompt, state.explicitToolAction);

    // If no deterministic match and prompt implies an operation/tool, invoke LangChain ChatGoogleGenerativeAI.bindTools()
    const isActionQuery =
      /\b(create|add|register|new|bill|order|record|payment|settle|ticket|reply|resolve|generate|export|send|mail|email|pdf|excel|xlsx|image|chart|poster|village|customer)\b/i.test(
        state.prompt
      );

    if (planned.length === 0 && isActionQuery && !state.image && process.env.GEMINI_API_KEY) {
      try {
        const geminiBrain = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          apiKey: process.env.GEMINI_API_KEY,
          temperature: 0.1,
          maxRetries: 1,
        });

        const modelWithTools = geminiBrain.bindTools(langchainTools);
        const aiMsg = await modelWithTools.invoke([
          new SystemMessage(
            `You are the LangGraph Autonomous Operations Agent for KB Fashions & Khata. Select and invoke the appropriate structured tool when the administrator asks to generate a PDF, Excel sheet, visual chart/image, send an email, or create/update a village, customer, order bill, payment, or support ticket.\n\nLive DB Context:\n${state.dbContextSummary}`
          ),
          new HumanMessage(state.prompt),
        ]);

        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          planned = aiMsg.tool_calls.map((tc) => ({
            toolName: tc.name,
            args: (tc.args as Record<string, any>) || {},
          }));
        }
      } catch (err: any) {
        console.warn("[LangGraph Agent Planner] ChatGoogleGenerativeAI tool binding fallback:", err?.message);
      }
    }

    return {
      plannedToolCalls: planned,
      graphTrace: [
        {
          node: "agent_planner_node",
          label: "Gemini LLM Brain & Tool Router",
          framework: "LangChain ChatGoogleGenerativeAI",
          durationMs: Date.now() - t0,
          detail:
            planned.length > 0
              ? `Scheduled ${planned.length} tool(s): ${planned.map((p) => p.toolName).join(", ")}`
              : "Routed to analytical synthesis",
        },
      ],
    };
  };

  // NODE 3: LangChain Structured Tool Executor Node
  const toolExecutorNode = async (state: typeof AdminAgentState.State) => {
    const t0 = Date.now();
    collectedSteps.length = 0;
    collectedArtifacts.length = 0;
    collectedMarkdown.length = 0;

    for (const call of state.plannedToolCalls) {
      const structuredTool = toolsByName.get(call.toolName);
      if (structuredTool) {
        try {
          await structuredTool.invoke(call.args);
        } catch {
          // Fallback to direct execution if Zod defaults needed coercion
          const res = await executeAdminAgentTool(call.toolName, call.args);
          collectedSteps.push(res.step);
          if (res.artifact) collectedArtifacts.push(res.artifact);
          if (res.markdownSummary) collectedMarkdown.push(res.markdownSummary);
        }
      } else {
        const res = await executeAdminAgentTool(call.toolName, call.args);
        collectedSteps.push(res.step);
        if (res.artifact) collectedArtifacts.push(res.artifact);
        if (res.markdownSummary) collectedMarkdown.push(res.markdownSummary);
      }
    }

    // Refresh PostgreSQL state after tool mutations
    const refreshed = await fetchLiveStoreSnapshot();

    return {
      dbContextSummary: refreshed.dbContextSummary,
      metrics: refreshed.metrics,
      toolSteps: [...collectedSteps],
      artifacts: [...collectedArtifacts],
      toolMarkdownBlocks: [...collectedMarkdown],
      graphTrace: [
        {
          node: "tool_executor_node",
          label: "LangChain DynamicStructuredTool Executor",
          framework: "LangChain Core Tools + Zod",
          durationMs: Date.now() - t0,
          detail: `Executed ${collectedSteps.length} tool(s) & synchronized PostgreSQL ledger`,
        },
      ],
    };
  };

  // NODE 4: Gemini LLM Response Synthesizer Node
  const responseSynthesizerNode = async (state: typeof AdminAgentState.State) => {
    const t0 = Date.now();

    if (state.explicitToolAction && state.toolMarkdownBlocks.length > 0) {
      const fastAnswer = `${state.toolMarkdownBlocks.join("\n\n")}`;
      return {
        finalAnswer: fastAnswer,
        graphTrace: [
          {
            node: "response_synthesizer_node",
            label: "Executive Response Synthesizer",
            framework: "LangGraph State Output",
            durationMs: Date.now() - t0,
            detail: "Synthesized structured tool artifact report",
          },
        ],
      };
    }

    const systemPrompt = `
You are the AI Assistant for "KB Fashions & Khata" (Tandoor, Mancherial Dist, Telangana).
You are connected to the live store database and can generate PDF reports, Excel workbooks, visual charts/images, send store emails, and manage villages, customers, bills, payments, and support tickets directly when asked.

Core Directives:
1. Ground every single number, customer balance, village name, and order reference in the LIVE STORE DATABASE CONTEXT provided.
2. Format answers naturally and concisely like ChatGPT using clean Markdown headings, bold figures, rupee symbols (₹), and structured tables where helpful.
3. Do NOT mention internal framework names (like LangGraph, LangChain, StateGraph, or tool function names) in your response. If a file, chart, or image was generated, present it naturally.
4. Support English, Hinglish, and Telugu (తెలుగు) seamlessly.
`;

    const toolExecutionContext =
      state.toolSteps.length > 0
        ? `\n\n=== COMPLETED ACTIONS IN THIS TURN ===\n${state.toolSteps.map((s) => `- ${s.label}: ${s.summary}`).join("\n")}\n`
        : "";

    let synthesizedText = "";

    // Try LangChain ChatGoogleGenerativeAI first if no multimodal image is attached
    if (!state.image && process.env.GEMINI_API_KEY) {
      try {
        const chatModel = new ChatGoogleGenerativeAI({
          model: "gemini-flash-lite-latest",
          apiKey: process.env.GEMINI_API_KEY,
          temperature: 0.4,
          maxRetries: 1,
        });

        const messages: BaseMessage[] = [
          new SystemMessage(
            `${systemPrompt}\n\n=== LIVE POSTGRESQL CONTEXT ===\n${state.dbContextSummary}${toolExecutionContext}`
          ),
        ];

        for (const msg of state.conversationHistory.slice(-6)) {
          if (msg.role === "user") {
            messages.push(new HumanMessage(msg.content));
          } else {
            messages.push(new AIMessage(msg.content));
          }
        }
        messages.push(new HumanMessage(state.prompt));

        const res = await chatModel.invoke(messages);
        if (typeof res.content === "string" && res.content.trim()) {
          synthesizedText = res.content;
        }
      } catch {
        // Fallback to multi-model resilient askGeminiAssistant
      }
    }

    if (!synthesizedText) {
      synthesizedText = await askGeminiAssistant({
        prompt: state.prompt,
        conversationHistory: state.conversationHistory.map((m) => ({
          role: m.role === "assistant" || m.role === "model" ? "model" : "user",
          text: m.content || "",
        })),
        dbContextSummary: `${state.dbContextSummary}${toolExecutionContext}`,
        systemInstruction: systemPrompt,
        temperature: 0.4,
        image: state.image,
      });
    }

    const combinedAnswer =
      state.toolMarkdownBlocks.length > 0
        ? `${state.toolMarkdownBlocks.join("\n\n")}\n\n---\n\n${synthesizedText}`
        : synthesizedText;

    return {
      finalAnswer: combinedAnswer,
      graphTrace: [
        {
          node: "response_synthesizer_node",
          label: "Gemini LLM Brain Synthesizer",
          framework: "LangChain ChatGoogleGenerativeAI",
          durationMs: Date.now() - t0,
          detail: "Generated grounded markdown response",
        },
      ],
    };
  };

  // Conditional Edge Router
  const shouldExecuteTools = (state: typeof AdminAgentState.State) => {
    if (state.plannedToolCalls && state.plannedToolCalls.length > 0) {
      return "tool_executor_node";
    }
    return "response_synthesizer_node";
  };

  // Compile the LangGraph StateGraph
  const workflow = new StateGraph(AdminAgentState)
    .addNode("context_loader_node", contextLoaderNode)
    .addNode("agent_planner_node", agentPlannerNode)
    .addNode("tool_executor_node", toolExecutorNode)
    .addNode("response_synthesizer_node", responseSynthesizerNode)
    .addEdge(START, "context_loader_node")
    .addEdge("context_loader_node", "agent_planner_node")
    .addConditionalEdges("agent_planner_node", shouldExecuteTools, {
      tool_executor_node: "tool_executor_node",
      response_synthesizer_node: "response_synthesizer_node",
    })
    .addEdge("tool_executor_node", "response_synthesizer_node")
    .addEdge("response_synthesizer_node", END);

  const appGraph = workflow.compile();

  // Invoke the compiled LangGraph agent
  const finalState = await appGraph.invoke({
    prompt: params.prompt,
    conversationHistory: params.conversationHistory || [],
    image: params.image,
    explicitToolAction: params.toolAction,
  });

  const latestSnapshot = await fetchLiveStoreSnapshot();

  return {
    answer: finalState.finalAnswer,
    toolSteps: finalState.toolSteps,
    artifacts: finalState.artifacts,
    graphTrace: finalState.graphTrace,
    metrics: latestSnapshot.metrics,
    villages: latestSnapshot.villagesList,
    customers: latestSnapshot.topDebtors.map((c) => ({
      id: c.id,
      name: c.name,
      customerCode: c.customerCode,
      mobile: c.mobile,
      email: c.email,
      currentBalance: Number(c.currentBalance),
      villageName: c.village.name,
    })),
  };
}

