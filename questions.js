/* =============================================================================
   questions.js — the question bank.

   This file has NO app logic in it. Edit freely: add, delete, or reorder
   objects in the QUESTIONS array and the app picks up the changes on reload.

   Schema
   ------
   {
     id:          "unique-string",          // used for the missed/skipped list
     topic:       "free text label",        // shown as a chalk tag on the card
     type:        "two-choice" | "true-false",
     question:    "The prompt.",
     optionA:     "Left-swipe label",       // true-false → "False"
     optionB:     "Right-swipe label",      // true-false → "True"
     correct:     "A" | "B",
     explanation: "Why that's the answer. Shown after you commit."
   }

   Deck theme: metrics, plus the systems they get measured on. Four metric families —
     BUSINESS  what the company cares about (money, users, retention)
     OFFLINE   what you measure on held-out data before shipping
     ONLINE    what you measure on live traffic and in experiments
     TRAINING  what you watch on the loss curve while the model is learning
   — with TAXONOMY on telling those apart, MONITORING on drift, and SYSTEMS on the
   machinery around the model: feature stores, pipelines, deployment, failure modes,
   retrieval architecture, position bias, and cold start.
   ============================================================================= */

const QUESTIONS = [

  /* ---------------------------------------------------------------------------
     TAXONOMY — telling the four families apart
     ------------------------------------------------------------------------ */
  {
    id: "tax-001",
    topic: "taxonomy",
    type: "two-choice",
    question: "Your fraud model's AUC goes from 0.91 to 0.94 on a frozen test set. Which family of metric just moved?",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "A",
    explanation: "Measured on static held-out data, before any user sees it. Offline metrics are cheap, repeatable, and available on every commit — which is exactly why they're proxies, not truth."
  },
  {
    id: "tax-002",
    topic: "taxonomy",
    type: "two-choice",
    question: "Revenue per session rises 2% during a two-week experiment. That is primarily a…",
    optionA: "Training metric",
    optionB: "Business metric",
    correct: "B",
    explanation: "It's denominated in money and it's what leadership actually funds. It's also being read online, which is the usual arrangement: business metrics get measured through online experiments."
  },
  {
    id: "tax-003",
    topic: "taxonomy",
    type: "true-false",
    question: "A model can win on every offline metric and still lose the A/B test.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Routinely. Offline data is logged under the old policy, so it carries position bias and missing counterfactuals; and offline eval ignores latency, UI fit, and feedback loops. The offline–online gap is the central problem of applied ML."
  },
  {
    id: "tax-004",
    topic: "taxonomy",
    type: "two-choice",
    question: "Gradient norm per optimizer step belongs to which family?",
    optionA: "Offline evaluation metric",
    optionB: "Training metric",
    correct: "B",
    explanation: "Training metrics describe the optimization process itself — loss, gradient norm, learning rate, throughput. They tell you whether learning is healthy, not whether the model is good."
  },
  {
    id: "tax-005",
    topic: "taxonomy",
    type: "true-false",
    question: "The OEC (Overall Evaluation Criterion) of an experiment should usually be the model's loss function.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "The OEC is the single number the experiment is decided on, and it should encode long-term user and business value. Cross-entropy is a training convenience, not a statement about what the product is for."
  },
  {
    id: "tax-006",
    topic: "taxonomy",
    type: "two-choice",
    question: "You want a metric cheap enough to run fifty times a day while iterating. Which family?",
    optionA: "Online",
    optionB: "Offline",
    correct: "B",
    explanation: "Offline evaluation exists to buy iteration speed. Online tests cost real traffic and real weeks, so you spend them only on candidates offline eval already liked."
  },
  {
    id: "tax-007",
    topic: "taxonomy",
    type: "two-choice",
    question: "p99 inference latency is best described as…",
    optionA: "A training metric",
    optionB: "An online / system metric",
    correct: "B",
    explanation: "It only exists once real requests are hitting a real service. It's usually run as a guardrail: a quality win that blows the latency budget is not a win."
  },
  {
    id: "tax-008",
    topic: "taxonomy",
    type: "true-false",
    question: "Guardrail metrics exist to confirm that a win on the primary metric didn't come at an unacceptable cost somewhere else.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Latency, crash rate, unsubscribe rate, support tickets, revenue. They aren't expected to improve — they're expected not to break."
  },
  {
    id: "tax-009",
    topic: "taxonomy",
    type: "two-choice",
    question: "Which metric is closest to the business and furthest from the model?",
    optionA: "Customer lifetime value",
    optionB: "Log loss",
    correct: "A",
    explanation: "There's a chain: training loss → offline metric → online engagement metric → business outcome. Every link is a place where an improvement can fail to propagate."
  },
  {
    id: "tax-010",
    topic: "taxonomy",
    type: "two-choice",
    question: "A metric you optimize directly will eventually…",
    optionA: "Stay a good measure of what you meant",
    optionB: "Stop being a good measure of what you meant",
    correct: "B",
    explanation: "Goodhart's law. Optimize click-through and you get clickbait; optimize watch time and you get autoplay traps. This is why you pair a primary metric with guardrails and long-horizon holdouts."
  },

  /* ---------------------------------------------------------------------------
     BUSINESS METRICS
     ------------------------------------------------------------------------ */
  {
    id: "biz-001",
    topic: "business",
    type: "two-choice",
    question: "CAC stands for…",
    optionA: "Cumulative Annual Conversion",
    optionB: "Customer Acquisition Cost",
    correct: "B",
    explanation: "Fully-loaded sales and marketing spend divided by new customers won in the period. The honest version includes salaries and tooling, not just ad spend."
  },
  {
    id: "biz-002",
    topic: "business",
    type: "two-choice",
    question: "An LTV : CAC ratio around 3 : 1 is usually read as…",
    optionA: "Healthy",
    optionB: "A red flag",
    correct: "A",
    explanation: "Rule of thumb: below ~1 you lose money per customer; around 3 is a sustainable engine. Much above 3 can mean you're underinvesting in growth."
  },
  {
    id: "biz-003",
    topic: "business",
    type: "true-false",
    question: "A high LTV is enough to justify high acquisition spend, regardless of payback period.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "LTV ignores time. If payback takes 30 months you're financing every new customer for two and a half years, and you can starve on paper-profitable growth."
  },
  {
    id: "biz-004",
    topic: "business",
    type: "two-choice",
    question: "DAU / MAU is a proxy for…",
    optionA: "Stickiness — how many days a month a user shows up",
    optionB: "Churn",
    correct: "A",
    explanation: "A ratio of 0.2 means the average monthly user visits about 6 days a month. Messaging apps sit high; tax software sits very low, and that's fine."
  },
  {
    id: "biz-005",
    topic: "business",
    type: "two-choice",
    question: "Net revenue retention above 100% means…",
    optionA: "New customer acquisition is accelerating",
    optionB: "Existing customers expand faster than they churn or downgrade",
    correct: "B",
    explanation: "NRR counts upsell, cross-sell, downgrades, and churn within the existing base only. Above 100% the business grows even with zero new logos."
  },
  {
    id: "biz-006",
    topic: "business",
    type: "two-choice",
    question: "For a marketplace, which number does the marketplace actually book as revenue?",
    optionA: "GMV",
    optionB: "Take rate × GMV",
    correct: "B",
    explanation: "GMV is the total value transacted across the platform; the platform keeps only its commission. Quoting GMV as revenue is a classic pitch-deck sleight of hand."
  },
  {
    id: "biz-007",
    topic: "business",
    type: "true-false",
    question: "For the same cohort and the same period, retention rate = 1 − churn rate.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "They're complements by construction. The trap is comparing a monthly churn number against an annual retention number, or mixing logo churn with revenue churn."
  },
  {
    id: "biz-008",
    topic: "business",
    type: "two-choice",
    question: "ARPU divides revenue by…",
    optionA: "All active users",
    optionB: "Only paying users",
    correct: "A",
    explanation: "ARPPU is the paying-users version. In a freemium product the two can differ by 50×, so mixing them up makes monetization look wildly better or worse than it is."
  },
  {
    id: "biz-009",
    topic: "business",
    type: "two-choice",
    question: "NPS is computed as…",
    optionA: "The mean score out of 10",
    optionB: "% promoters (9–10) minus % detractors (0–6)",
    correct: "B",
    explanation: "Scores of 7–8 are 'passives' and are thrown away entirely. That discarding is why NPS is noisy and why moves of a few points usually mean nothing."
  },
  {
    id: "biz-010",
    topic: "business",
    type: "two-choice",
    question: "CAC payback period measures…",
    optionA: "Months of gross profit needed to earn back the acquisition cost",
    optionB: "Months until the average customer churns",
    correct: "A",
    explanation: "It's the cash-flow question LTV can't answer. Under 12 months is generally considered strong for SaaS."
  },
  {
    id: "biz-011",
    topic: "business",
    type: "true-false",
    question: "LTV should be built from gross margin, not from revenue.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Serving a customer costs money — hosting, support, payment fees, and for ML products, inference. Revenue-based LTV systematically flatters low-margin businesses."
  },
  {
    id: "biz-012",
    topic: "business",
    type: "two-choice",
    question: "Your recommender lifts CTR 8% but average order value drops 10%. The right move is…",
    optionA: "Ship it — CTR is the model's metric",
    optionB: "Check revenue per session before shipping anything",
    correct: "B",
    explanation: "Textbook proxy failure: the model learned to surface cheap, clickable items. Whenever a rate metric and a value metric disagree, trust the one denominated in money."
  },
  {
    id: "biz-013",
    topic: "business",
    type: "two-choice",
    question: "Which is the *leading* indicator?",
    optionA: "Activation rate in a user's first session",
    optionB: "Quarterly revenue",
    correct: "A",
    explanation: "Leading indicators move first and are steerable; lagging indicators confirm what already happened. ML teams need leading indicators because revenue arrives too late to iterate on."
  },
  {
    id: "biz-014",
    topic: "business",
    type: "two-choice",
    question: "Contribution margin subtracts…",
    optionA: "All fixed overhead",
    optionB: "The variable costs tied to each unit sold",
    correct: "B",
    explanation: "It's the per-unit money left over to pay for fixed costs. For an ML feature, GPU inference cost is a variable cost and belongs here."
  },
  {
    id: "biz-015",
    topic: "business",
    type: "true-false",
    question: "Cost per 1,000 inferences is a business metric as much as an engineering one.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It sits directly in contribution margin. A quality win that triples serving cost may be a net loss, which is why cost-per-prediction is usually a hard guardrail."
  },
  {
    id: "biz-016",
    topic: "business",
    type: "two-choice",
    question: "A cohort retention curve that flattens after week 4 suggests…",
    optionA: "The product is dying",
    optionB: "You've found a durable core of users",
    correct: "B",
    explanation: "A curve that flattens has an asymptote — those users stay. A curve that keeps sloping toward zero means everyone eventually leaves, and no amount of acquisition fixes it."
  },
  {
    id: "biz-017",
    topic: "business",
    type: "two-choice",
    question: "Conversion rate and average order value both matter. Revenue per visitor is…",
    optionA: "Their product",
    optionB: "Their average",
    correct: "A",
    explanation: "RPV = conversion rate × AOV. Optimizing either alone lets you win the sub-metric and lose the composite, which is why RPV is the usual e-commerce OEC."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — CLASSIFICATION
     ------------------------------------------------------------------------ */
  {
    id: "off-001",
    topic: "offline · classification",
    type: "two-choice",
    question: "Precision answers which question?",
    optionA: "Of the real positives, how many did I catch?",
    optionB: "Of the ones I flagged, how many were actually right?",
    correct: "B",
    explanation: "TP / (TP + FP). Precision is about the cost of a false alarm — the denominator is your own predictions."
  },
  {
    id: "off-002",
    topic: "offline · classification",
    type: "two-choice",
    question: "Recall answers which question?",
    optionA: "Of the real positives, how many did I catch?",
    optionB: "Of the ones I flagged, how many were actually right?",
    correct: "A",
    explanation: "TP / (TP + FN). Recall is about the cost of a miss — the denominator is reality, not your predictions."
  },
  {
    id: "off-003",
    topic: "offline · classification",
    type: "true-false",
    question: "F1 is the harmonic mean of precision and recall.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Harmonic, not arithmetic — so it's dragged down hard by whichever is worse. Precision 1.0 with recall 0.02 gives F1 ≈ 0.04, which is the point."
  },
  {
    id: "off-004",
    topic: "offline · classification",
    type: "two-choice",
    question: "1 in 10,000 transactions is fraud. A model that always predicts 'not fraud' gets…",
    optionA: "99.99% accuracy and zero usefulness",
    optionB: "Low accuracy, correctly penalized",
    correct: "A",
    explanation: "The accuracy paradox. Under imbalance, accuracy measures the base rate, not the model. Reach for precision/recall, PR-AUC, or MCC instead."
  },
  {
    id: "off-005",
    topic: "offline · classification",
    type: "two-choice",
    question: "With a 1% positive rate, which curve is more informative?",
    optionA: "ROC",
    optionB: "Precision–Recall",
    correct: "B",
    explanation: "ROC's x-axis is FPR, whose denominator is the huge negative class — so thousands of false positives barely move it. PR curves put those false positives in the numerator's way."
  },
  {
    id: "off-006",
    topic: "offline · classification",
    type: "two-choice",
    question: "ROC-AUC has a clean probabilistic reading. It is…",
    optionA: "The probability a random positive is ranked above a random negative",
    optionB: "The average precision across all thresholds",
    correct: "A",
    explanation: "That's why AUC = 0.5 is coin-flip ranking. It also means AUC says nothing about whether your predicted probabilities are numerically trustworthy."
  },
  {
    id: "off-007",
    topic: "offline · classification",
    type: "true-false",
    question: "ROC-AUC depends on the decision threshold you choose.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "AUC integrates over every threshold, so it's a pure ranking metric. Threshold selection is a separate, business-driven decision made after you like the ranking."
  },
  {
    id: "off-008",
    topic: "offline · classification",
    type: "two-choice",
    question: "Brier score measures…",
    optionA: "Ranking quality only",
    optionB: "The mean squared error of predicted probabilities",
    correct: "B",
    explanation: "It rewards being both discriminative and calibrated, and it decomposes into calibration + refinement terms. Lower is better; 0.25 is what you get by always predicting 0.5."
  },
  {
    id: "off-009",
    topic: "offline · classification",
    type: "two-choice",
    question: "Your model says 70% and the event happens 40% of the time. That's a failure of…",
    optionA: "Calibration",
    optionB: "Discrimination",
    correct: "A",
    explanation: "Ranking can still be perfect while the numbers are meaningless. It matters the moment a downstream system multiplies your probability by a dollar amount — bidding, triage, expected-value routing."
  },
  {
    id: "off-010",
    topic: "offline · classification",
    type: "two-choice",
    question: "ECE stands for…",
    optionA: "Empirical Class Entropy",
    optionB: "Expected Calibration Error",
    correct: "B",
    explanation: "Bin predictions by confidence, compare each bin's average confidence to its observed accuracy, and take the weighted average gap. It's the number behind a reliability diagram."
  },
  {
    id: "off-011",
    topic: "offline · classification",
    type: "two-choice",
    question: "F-beta with β = 2 weights…",
    optionA: "Recall more heavily than precision",
    optionB: "Precision more heavily than recall",
    correct: "A",
    explanation: "β > 1 favors recall, β < 1 favors precision. Pick β from the cost ratio of a miss to a false alarm rather than by habit."
  },
  {
    id: "off-012",
    topic: "offline · classification",
    type: "true-false",
    question: "Matthews Correlation Coefficient uses all four cells of the confusion matrix.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "That's its advantage over F1, which ignores true negatives entirely. MCC ranges −1 to +1 and stays honest under class imbalance."
  },
  {
    id: "off-013",
    topic: "offline · classification",
    type: "two-choice",
    question: "Specificity is…",
    optionA: "TP / (TP + FN)",
    optionB: "TN / (TN + FP)",
    correct: "B",
    explanation: "Specificity is recall on the negative class — the true negative rate. Option A is sensitivity, i.e. ordinary recall."
  },
  {
    id: "off-014",
    topic: "offline · classification",
    type: "two-choice",
    question: "For a cancer screening triage model, the more expensive error is normally…",
    optionA: "A false negative",
    optionB: "A false positive",
    correct: "A",
    explanation: "A missed cancer is far worse than an extra follow-up scan, so you tune for high recall and accept the precision cost. The metric follows the cost structure, never the other way around."
  },
  {
    id: "off-015",
    topic: "offline · classification",
    type: "two-choice",
    question: "The KS statistic in credit scoring measures…",
    optionA: "The maximum separation between the good and bad cumulative distributions",
    optionB: "Accuracy at the optimal threshold",
    correct: "A",
    explanation: "It's a single number for how far apart the two score distributions get. Closely related to Gini, which is just 2·AUC − 1."
  },
  {
    id: "off-016",
    topic: "offline · classification",
    type: "two-choice",
    question: "A lift chart tells you…",
    optionA: "How much better the top decile does than random targeting",
    optionB: "How well probabilities are calibrated",
    correct: "A",
    explanation: "Marketing's favorite framing: if the top 10% by score contains 40% of the responders, lift is 4×. It answers 'who should I contact first', not 'is the model well-specified'."
  },
  {
    id: "off-017",
    topic: "offline · fairness",
    type: "two-choice",
    question: "Equal opportunity requires parity across groups in…",
    optionA: "Positive prediction rate",
    optionB: "True positive rate",
    correct: "B",
    explanation: "Equal opportunity equalizes recall for qualified candidates. Demographic parity equalizes the selection rate itself — and the two are generally mathematically incompatible."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — REGRESSION & FORECASTING
     ------------------------------------------------------------------------ */
  {
    id: "off-101",
    topic: "offline · regression",
    type: "two-choice",
    question: "Which punishes a few large errors harder?",
    optionA: "MAE",
    optionB: "RMSE",
    correct: "B",
    explanation: "Squaring means one 10-unit error costs as much as a hundred 1-unit errors. Choose RMSE when big misses are disproportionately expensive, MAE when they aren't."
  },
  {
    id: "off-102",
    topic: "offline · regression",
    type: "true-false",
    question: "MAPE becomes unstable when actual values approach zero.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "The actual value is in the denominator, so near-zero truths blow the percentage up to infinity. MAPE also penalizes over-forecasting more than under-forecasting, which quietly biases models low."
  },
  {
    id: "off-103",
    topic: "offline · regression",
    type: "two-choice",
    question: "An R² of 0.0 means the model is…",
    optionA: "Exactly as good as always predicting the mean",
    optionB: "Perfectly and inversely wrong",
    correct: "A",
    explanation: "R² is scored against the mean baseline, and it can go negative when the model is worse than that. It also rises mechanically with more features, which is what adjusted R² corrects."
  },
  {
    id: "off-104",
    topic: "offline · regression",
    type: "two-choice",
    question: "Over-forecasting costs you 3× what under-forecasting costs. The right loss is…",
    optionA: "Symmetric squared error",
    optionB: "Quantile (pinball) loss",
    correct: "B",
    explanation: "Pinball loss lets you target a specific quantile, so asymmetric costs get an asymmetric predictor. Inventory and capacity planning live on this."
  },
  {
    id: "off-105",
    topic: "offline · regression",
    type: "two-choice",
    question: "RMSLE is a good fit when…",
    optionA: "Targets span orders of magnitude and relative error is what matters",
    optionB: "Targets are frequently negative",
    correct: "A",
    explanation: "Taking logs turns ratio errors into additive ones, so being off by 100 on a target of 10 is punished far more than being off by 100 on a target of 100,000. It's undefined for negatives."
  },
  {
    id: "off-106",
    topic: "offline · regression",
    type: "true-false",
    question: "Adjusted R² can decrease when you add a feature that doesn't pull its weight.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It penalizes parameter count, so noise features cost you. Plain R² can only go up, which makes it useless for model comparison at different complexities."
  },
  {
    id: "off-107",
    topic: "offline · regression",
    type: "two-choice",
    question: "Retail demand forecasters often prefer WAPE over MAPE because it…",
    optionA: "Is differentiable everywhere",
    optionB: "Weights errors by volume instead of averaging per-item percentages",
    correct: "B",
    explanation: "MAPE lets a slow-moving SKU with two units of demand dominate the average. WAPE divides total absolute error by total actuals, so the big sellers count for what they're worth."
  },
  {
    id: "off-108",
    topic: "offline · regression",
    type: "two-choice",
    question: "MASE compares your forecast error against…",
    optionA: "A naive seasonal baseline",
    optionB: "The variance of the target",
    correct: "A",
    explanation: "MASE < 1 means you beat 'predict last period'. It's scale-free, so you can average it across series that live in different units."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — RANKING, RECSYS, NLP, VISION
     ------------------------------------------------------------------------ */
  {
    id: "off-201",
    topic: "offline · ranking",
    type: "two-choice",
    question: "NDCG rewards…",
    optionA: "Total relevant items retrieved anywhere in the list",
    optionB: "Relevant items placed nearer the top",
    correct: "B",
    explanation: "The logarithmic discount means position 1 is worth far more than position 10, and normalizing by the ideal ordering makes queries comparable. It also handles graded relevance, not just binary."
  },
  {
    id: "off-202",
    topic: "offline · ranking",
    type: "two-choice",
    question: "MRR is driven by…",
    optionA: "The rank of the first correct result",
    optionB: "The mean rank of all correct results",
    correct: "A",
    explanation: "Reciprocal of the first hit's position, averaged over queries. It's the right metric when users stop reading after they find one good answer — navigational search, QA retrieval."
  },
  {
    id: "off-203",
    topic: "offline · ranking",
    type: "true-false",
    question: "Precision@10 is blind to everything below position 10.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Which is a feature when users only see ten results, and a bug when you're evaluating a retriever that feeds a reranker. Match k to what the next stage actually consumes."
  },
  {
    id: "off-204",
    topic: "offline · recsys",
    type: "two-choice",
    question: "Catalog coverage measures…",
    optionA: "The fraction of the item catalog the recommender ever surfaces",
    optionB: "The fraction of users who receive recommendations",
    correct: "A",
    explanation: "A model can hit great accuracy by recommending the same 200 bestsellers forever. Coverage, novelty and intra-list diversity are the counterweights to popularity bias."
  },
  {
    id: "off-205",
    topic: "offline · recsys",
    type: "true-false",
    question: "Offline recsys evaluation is biased because the logs only contain feedback on items the old model chose to show.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "You never observe what would have happened for unshown items — the missing-not-at-random problem. Counterfactual estimators like IPS exist to patch it, and they're why offline recsys gains so often evaporate online."
  },
  {
    id: "off-206",
    topic: "offline · NLP",
    type: "two-choice",
    question: "BLEU is precision-oriented. ROUGE is…",
    optionA: "Recall-oriented",
    optionB: "Also precision-oriented",
    correct: "A",
    explanation: "BLEU asks how much of the candidate appears in the reference (translation); ROUGE asks how much of the reference appears in the candidate (summarization). The task's failure mode picks the metric."
  },
  {
    id: "off-207",
    topic: "offline · NLP",
    type: "two-choice",
    question: "Perplexity is…",
    optionA: "Average per-token accuracy",
    optionB: "The exponential of average negative log-likelihood per token",
    correct: "B",
    explanation: "Read it as the effective number of equally likely choices the model felt it had at each step. Perplexity 20 means it was about as unsure as picking among 20 options."
  },
  {
    id: "off-208",
    topic: "offline · NLP",
    type: "true-false",
    question: "Lower perplexity reliably means a more helpful assistant.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "Perplexity measures next-token prediction on some corpus, not instruction-following, honesty, or usefulness. Post-training frequently raises perplexity while making the model far better to talk to."
  },
  {
    id: "off-209",
    topic: "offline · LLM",
    type: "two-choice",
    question: "pass@k measures…",
    optionA: "The probability at least one of k sampled solutions passes the tests",
    optionB: "The average fraction of tests passed across k samples",
    correct: "A",
    explanation: "It's the natural metric when you can verify and retry. pass@1 and pass@100 can tell very different stories about the same model — sampling budget is part of the claim."
  },
  {
    id: "off-210",
    topic: "offline · LLM",
    type: "two-choice",
    question: "In RAG evaluation, 'groundedness' (faithfulness) asks…",
    optionA: "Whether retrieval returned results fast enough",
    optionB: "Whether every claim in the answer is supported by the retrieved context",
    correct: "B",
    explanation: "It's separate from answer correctness — an answer can be right and ungrounded, or grounded in a wrong passage. Full RAG eval needs retrieval quality, groundedness, and answer relevance as three distinct numbers."
  },
  {
    id: "off-211",
    topic: "offline · LLM",
    type: "true-false",
    question: "LLM-as-judge scores can shift when the judge model is upgraded, even with the same rubric.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Judges have their own biases — position, verbosity, self-preference — and those change across versions. Pin the judge version and keep a human-labeled anchor set to detect judge drift."
  },
  {
    id: "off-212",
    topic: "offline · vision",
    type: "two-choice",
    question: "mAP@[0.5:0.95] averages precision over…",
    optionA: "IoU thresholds from 0.5 to 0.95",
    optionB: "Model checkpoints",
    correct: "A",
    explanation: "The COCO standard. Averaging over stricter and stricter overlap requirements rewards tight boxes, not just roughly-correct ones."
  },
  {
    id: "off-213",
    topic: "offline · vision",
    type: "two-choice",
    question: "The Dice coefficient is the standard metric for…",
    optionA: "Ranking quality",
    optionB: "Segmentation mask overlap",
    correct: "B",
    explanation: "2|A∩B| / (|A|+|B|) — monotonically related to IoU but more forgiving on small objects, which is why medical imaging prefers it."
  },
  {
    id: "off-214",
    topic: "offline · vision",
    type: "two-choice",
    question: "FID compares generated and real images by measuring…",
    optionA: "Distance between feature distributions from a pretrained network",
    optionB: "Pixel-wise mean squared error",
    correct: "A",
    explanation: "It fits Gaussians to Inception features and takes the Fréchet distance, so it scores realism and diversity together. It's also sensitive to sample size, so only compare FIDs computed identically."
  },
  {
    id: "off-215",
    topic: "offline · speech",
    type: "two-choice",
    question: "WER is computed as…",
    optionA: "Cosine similarity between transcript embeddings",
    optionB: "(insertions + deletions + substitutions) / reference words",
    correct: "B",
    explanation: "It's edit distance normalized by reference length, so it can exceed 100% when the model hallucinates extra words. CER is the same idea at character level, useful for languages without clean word boundaries."
  },
  {
    id: "off-216",
    topic: "offline · clustering",
    type: "two-choice",
    question: "Silhouette score compares each point's distance to its own cluster against…",
    optionA: "The nearest other cluster",
    optionB: "The global centroid",
    correct: "A",
    explanation: "Ranges −1 to 1; negative means the point probably belongs elsewhere. Adjusted Rand Index and NMI are the alternatives when you do have ground-truth labels."
  },

  /* ---------------------------------------------------------------------------
     ONLINE — EXPERIMENTATION
     ------------------------------------------------------------------------ */
  {
    id: "onl-001",
    topic: "online · experiments",
    type: "two-choice",
    question: "Sample Ratio Mismatch means…",
    optionA: "The realized traffic split doesn't match the intended allocation",
    optionB: "Your metric's variance is higher than planned",
    correct: "A",
    explanation: "You asked for 50/50 and got 50.6/49.4 with millions of users — that's a p-value of ~0 on the split itself. It means assignment or logging is broken."
  },
  {
    id: "onl-002",
    topic: "online · experiments",
    type: "true-false",
    question: "A small SRM is usually safe to ignore.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "SRM is a bug signal, not a noise signal. Whatever caused users to be dropped or double-counted is almost certainly correlated with the outcome, so the entire result is untrustworthy. Debug, don't adjust."
  },
  {
    id: "onl-003",
    topic: "online · experiments",
    type: "two-choice",
    question: "A novelty effect typically appears as…",
    optionA: "A flat result that grows over time",
    optionB: "A strong early lift that decays",
    correct: "B",
    explanation: "Users click the new thing because it's new. The mirror image is a primacy effect, where habituated users hate a change at first and adapt. Both argue for running long enough to see the curve flatten."
  },
  {
    id: "onl-004",
    topic: "online · experiments",
    type: "two-choice",
    question: "CUPED is a technique for…",
    optionA: "Reducing variance using pre-experiment data",
    optionB: "Correcting for multiple comparisons",
    correct: "A",
    explanation: "Regress out each user's pre-period behavior, and the residual metric has much lower variance — often cutting required runtime by half at the same power."
  },
  {
    id: "onl-005",
    topic: "online · experiments",
    type: "two-choice",
    question: "MDE stands for…",
    optionA: "Mean Deviation Estimate",
    optionB: "Minimum Detectable Effect",
    correct: "B",
    explanation: "The smallest true effect your sample size can reliably detect. Compute it before launch: if the MDE is 5% and a realistic win is 1%, the experiment cannot answer your question."
  },
  {
    id: "onl-006",
    topic: "online · experiments",
    type: "true-false",
    question: "Checking results daily and stopping the moment p < 0.05 inflates your false positive rate.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Continuous peeking with a fixed-horizon test can push the real Type I error well past 30%. Use sequential testing or always-valid confidence intervals if you want to look early."
  },
  {
    id: "onl-007",
    topic: "online · experiments",
    type: "two-choice",
    question: "In a two-sided marketplace, the main threat to a naive user-level A/B test is…",
    optionA: "Interference between arms — one violation of SUTVA",
    optionB: "Insufficient traffic",
    correct: "A",
    explanation: "Treatment users consuming scarce supply changes what control users see, so the arms aren't independent. Cannibalization makes the treatment look better than the global effect would be."
  },
  {
    id: "onl-008",
    topic: "online · experiments",
    type: "two-choice",
    question: "Switchback experiments randomize…",
    optionA: "Individual users",
    optionB: "Time slices within a region",
    correct: "B",
    explanation: "When units interfere — ride-hailing pricing, delivery dispatch — you flip the whole market between treatment and control on a schedule and compare periods."
  },
  {
    id: "onl-009",
    topic: "online · experiments",
    type: "two-choice",
    question: "Interleaving is popular in search ranking because…",
    optionA: "It is dramatically more sensitive per unit of traffic",
    optionB: "It removes the need for a control condition",
    correct: "A",
    explanation: "Blending both rankers' results into one list makes every user their own control, killing between-user variance. Teams report 10–100× sensitivity over A/B — at the cost of only answering ranking questions."
  },
  {
    id: "onl-010",
    topic: "online · experiments",
    type: "true-false",
    question: "Statistical significance implies practical significance.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "With enough traffic a 0.02% lift becomes significant and still isn't worth the maintenance cost. Always read the confidence interval against a pre-agreed threshold of what would matter."
  },
  {
    id: "onl-011",
    topic: "online · experiments",
    type: "two-choice",
    question: "A long-run holdout kept off the model for months measures…",
    optionA: "Cumulative long-term impact, including effects short tests can't see",
    optionB: "Day-one novelty",
    correct: "A",
    explanation: "Short tests miss learning effects, ad fatigue, and content-ecosystem shifts. Holdouts are how you find out whether a year of shipped 'wins' actually added up."
  },
  {
    id: "onl-012",
    topic: "online · experiments",
    type: "two-choice",
    question: "You evaluate 20 metrics at α = 0.05 on a null treatment. On average you'd expect…",
    optionA: "No false positives",
    optionB: "About one metric to look significant",
    correct: "B",
    explanation: "The multiple comparisons problem. Designate one primary metric in advance and treat the rest as exploratory, or control the false discovery rate."
  },
  {
    id: "onl-013",
    topic: "online · experiments",
    type: "two-choice",
    question: "A canary release is…",
    optionA: "Rolling out to a small traffic slice first while watching guardrails",
    optionB: "Testing offline before deploying",
    correct: "A",
    explanation: "It's a safety mechanism, not a measurement one — sized to detect catastrophes fast, not to detect 1% lifts. Ramping 1% → 5% → 25% → 100% is the usual shape."
  },
  {
    id: "onl-014",
    topic: "online · experiments",
    type: "two-choice",
    question: "Statistical power is the probability of…",
    optionA: "Rejecting a true null hypothesis",
    optionB: "Detecting an effect that is genuinely there",
    correct: "B",
    explanation: "1 − β, conventionally targeted at 80%. Underpowered tests don't just fail to find wins — the wins they do find are systematically overstated."
  },

  /* ---------------------------------------------------------------------------
     ONLINE — PRODUCT & SYSTEM METRICS
     ------------------------------------------------------------------------ */
  {
    id: "onl-101",
    topic: "online · product",
    type: "two-choice",
    question: "CTR alone is a risky north star for a feed because…",
    optionA: "It's too hard to measure reliably",
    optionB: "It rewards whatever provokes a click, not what satisfies",
    correct: "B",
    explanation: "The standard fix is a composite: pair CTR with dwell time, completion rate, and explicit signals like hides and 'not interested', so bait costs you somewhere."
  },
  {
    id: "onl-102",
    topic: "online · system",
    type: "two-choice",
    question: "Why do teams monitor p99 latency rather than the mean?",
    optionA: "The mean hides a slow tail that a meaningful share of requests actually experience",
    optionB: "p99 is cheaper to compute",
    correct: "A",
    explanation: "A page that fans out to 10 backend calls hits the p99 of at least one of them surprisingly often. Tail latency is what users feel."
  },
  {
    id: "onl-103",
    topic: "online · system",
    type: "true-false",
    question: "Throughput (QPS) and latency can be traded against each other via batching.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Bigger inference batches raise GPU utilization and QPS while adding queueing delay per request. The batch-size knob is exactly where this trade-off is set."
  },
  {
    id: "onl-104",
    topic: "online · system",
    type: "two-choice",
    question: "For a streaming LLM endpoint, the metric users feel first is…",
    optionA: "Total generation time",
    optionB: "Time to first token",
    correct: "B",
    explanation: "TTFT governs perceived responsiveness; inter-token latency governs whether the stream reads smoothly. Total time matters much less once text is moving."
  },
  {
    id: "onl-105",
    topic: "online · product",
    type: "two-choice",
    question: "D7 retention means…",
    optionA: "The share of a cohort still active on day 7 after signup",
    optionB: "The share of users active 7 days in a row",
    correct: "A",
    explanation: "Cohort-anchored, not streak-based. D1/D7/D30 is the standard shape check on whether the product has a habit in it."
  },
  {
    id: "onl-106",
    topic: "online · product",
    type: "true-false",
    question: "Session length is always a metric you want to increase.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "For a support search tool, a long session means the user couldn't find the answer. Always ask whether more time on task is success or failure for this particular product."
  },

  /* ---------------------------------------------------------------------------
     MONITORING & DRIFT
     ------------------------------------------------------------------------ */
  {
    id: "mon-001",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "PSI (Population Stability Index) detects…",
    optionA: "Overfitting during training",
    optionB: "A shift in a feature's or score's distribution versus a reference window",
    correct: "B",
    explanation: "Common rules of thumb: under 0.1 is stable, 0.1–0.25 warrants a look, above 0.25 is a real shift. It's a binned relative-entropy measure under a friendlier name."
  },
  {
    id: "mon-002",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Concept drift is…",
    optionA: "P(y | x) changes — the input-to-label relationship itself moves",
    optionB: "P(x) changes while the relationship holds",
    correct: "A",
    explanation: "Fraud tactics adapting to your detector is concept drift, and no amount of reweighting old data fixes it. Option B is covariate shift."
  },
  {
    id: "mon-003",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Covariate shift is…",
    optionA: "P(y | x) changes",
    optionB: "P(x) changes while P(y | x) stays put",
    correct: "B",
    explanation: "You expanded to a new region, so the input mix moved but the underlying physics didn't. Importance weighting can help here in a way it can't for concept drift."
  },
  {
    id: "mon-004",
    topic: "monitoring · drift",
    type: "true-false",
    question: "You can monitor prediction drift even when ground-truth labels arrive weeks later.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Input distributions and output score distributions are available in real time; labels aren't. That's why unsupervised drift signals are the first line of defense in long-feedback-loop systems like credit and churn."
  },
  {
    id: "mon-005",
    topic: "monitoring",
    type: "two-choice",
    question: "Training–serving skew most often comes from…",
    optionA: "Two separately implemented feature pipelines that quietly disagree",
    optionB: "A learning rate set too low",
    correct: "A",
    explanation: "Batch SQL for training, streaming Java for serving, and one of them handles nulls or timezones differently. A shared feature store exists mostly to make this class of bug impossible."
  },
  {
    id: "mon-006",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "The KS statistic compares…",
    optionA: "Two confusion matrices",
    optionB: "Two cumulative distribution functions",
    correct: "B",
    explanation: "The maximum vertical gap between two CDFs — nonparametric and easy to run per feature. On huge samples it flags trivial differences, so pair it with an effect-size threshold."
  },
  {
    id: "mon-007",
    topic: "monitoring",
    type: "true-false",
    question: "A model whose input distributions look perfectly stable can still be silently failing.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Concept drift, label leakage that only shows at serving time, and feedback loops all leave input distributions untouched. Stable inputs are a necessary but nowhere near sufficient health signal."
  },
  {
    id: "mon-008",
    topic: "monitoring",
    type: "two-choice",
    question: "A recommender's own outputs shaping the training data it later learns from is called…",
    optionA: "A feedback loop",
    optionB: "Covariate shift",
    correct: "A",
    explanation: "The model teaches itself that whatever it promoted is popular, and the rich get richer. Randomized exploration traffic is the standard antidote — a small permanent tax for unbiased data."
  },

  /* ---------------------------------------------------------------------------
     TRAINING METRICS
     ------------------------------------------------------------------------ */
  {
    id: "trn-001",
    topic: "training",
    type: "two-choice",
    question: "Training loss falling while validation loss climbs means…",
    optionA: "Overfitting",
    optionB: "Underfitting",
    correct: "A",
    explanation: "The model is memorizing the training set. Reach for more data, augmentation, regularization, or early stopping — not more parameters."
  },
  {
    id: "trn-002",
    topic: "training",
    type: "two-choice",
    question: "The generalization gap is…",
    optionA: "Test accuracy minus human accuracy",
    optionB: "Validation loss minus training loss",
    correct: "B",
    explanation: "It's the number that tells you whether your remaining error is a capacity problem or a data problem. A tiny gap with high error means underfitting; a large gap means the opposite."
  },
  {
    id: "trn-003",
    topic: "training",
    type: "true-false",
    question: "A gradient norm spiking right before a loss spike is a classic instability signature.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It's why grad-norm is plotted next to loss on every large training run. The usual responses are tighter clipping, a lower learning rate, skipping the offending batch, or rolling back a few hundred steps."
  },
  {
    id: "trn-004",
    topic: "training",
    type: "two-choice",
    question: "Gradient clipping constrains…",
    optionA: "The learning rate schedule",
    optionB: "The magnitude of the update, leaving its direction alone",
    correct: "B",
    explanation: "Norm-based clipping rescales the whole gradient vector when it exceeds a threshold. It's a stability guardrail, not a convergence-speed knob."
  },
  {
    id: "trn-005",
    topic: "training · efficiency",
    type: "two-choice",
    question: "MFU (Model FLOPs Utilization) is…",
    optionA: "Achieved FLOPs as a fraction of the hardware's theoretical peak",
    optionB: "GPU memory in use versus memory available",
    correct: "A",
    explanation: "Large transformer runs typically land in the 35–55% range. Low MFU points to communication overhead, pipeline bubbles, or a data loader that can't keep up."
  },
  {
    id: "trn-006",
    topic: "training",
    type: "two-choice",
    question: "The update-to-weight ratio is a healthy diagnostic when it sits around…",
    optionA: "1e-1",
    optionB: "1e-3",
    correct: "B",
    explanation: "Karpathy's rule of thumb: updates should be about a thousandth of the weight magnitude. Much larger and you're thrashing; much smaller and that layer is barely learning."
  },
  {
    id: "trn-007",
    topic: "training · efficiency",
    type: "two-choice",
    question: "Tokens per second is primarily a…",
    optionA: "Throughput metric",
    optionB: "Quality metric",
    correct: "A",
    explanation: "It sets how much compute your budget buys. Pair it with MFU: tokens/sec tells you the rate, MFU tells you whether the rate is close to what the hardware could do."
  },
  {
    id: "trn-008",
    topic: "training",
    type: "true-false",
    question: "Learning rate warmup mainly exists to stop large early updates from destabilizing training.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "At step zero the adaptive optimizer's variance estimates are garbage and the weights are random, so full-size steps can wreck the run. Ramping over a few hundred to few thousand steps fixes it."
  },
  {
    id: "trn-009",
    topic: "training",
    type: "two-choice",
    question: "Bits-per-byte is preferred over perplexity when…",
    optionA: "Comparing models that use different tokenizers",
    optionB: "Comparing checkpoints of a single model",
    correct: "A",
    explanation: "Perplexity is per-token, so a model with a bigger vocabulary gets a free-looking win. Normalizing by raw bytes puts everyone on the same denominator."
  },
  {
    id: "trn-010",
    topic: "training",
    type: "two-choice",
    question: "Early stopping monitors…",
    optionA: "Training loss",
    optionB: "A validation metric, with patience before it halts",
    correct: "B",
    explanation: "Training loss almost always keeps improving, so it can never tell you to stop. Note the leakage risk: the validation set you stop on has been partly optimized against."
  },
  {
    id: "trn-011",
    topic: "training · RL",
    type: "two-choice",
    question: "In PPO, clip fraction tells you…",
    optionA: "How often the probability ratio hit the clipping boundary",
    optionB: "How much of the reward was clipped",
    correct: "A",
    explanation: "Persistently high clip fraction means the policy is trying to move further per step than PPO permits — usually a signal to lower the learning rate or shrink the update size."
  },
  {
    id: "trn-012",
    topic: "training · RLHF",
    type: "two-choice",
    question: "KL divergence to the reference policy is tracked during RLHF in order to…",
    optionA: "Measure sample throughput",
    optionB: "Catch the policy drifting off and over-optimizing the reward model",
    correct: "B",
    explanation: "Reward models are imperfect proxies, so a policy that wanders far from the reference finds exploits rather than genuine improvements. Rising KL alongside rising reward and falling human ratings is the reward-hacking signature."
  },
  {
    id: "trn-013",
    topic: "training · RL",
    type: "two-choice",
    question: "A value function's explained variance sitting near zero means…",
    optionA: "The critic predicts returns no better than guessing the mean",
    optionB: "The critic is essentially perfect",
    correct: "A",
    explanation: "Explained variance of 1.0 is a perfect critic, 0 is mean-prediction, and negative is worse than that. A useless critic makes your advantage estimates pure noise."
  },
  {
    id: "trn-014",
    topic: "training · RLHF",
    type: "true-false",
    question: "Reward model accuracy on held-out human preference pairs is an offline metric.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It's held-out data scored before deployment, so it's offline by definition — even though the artifact it validates is part of an online-facing training loop. The families describe when you measure, not what you're measuring."
  },
  {
    id: "trn-015",
    topic: "training",
    type: "two-choice",
    question: "Loss going NaN mid-run most often points to…",
    optionA: "Too much training data",
    optionB: "Numerical overflow — fp16 range, a bad learning rate, or a division by zero",
    correct: "B",
    explanation: "Check the loss-scaler history, the max activation magnitudes, and whether the run has a bad batch. bf16's wider exponent range is why it largely displaced fp16 for large training."
  },
  {
    id: "trn-016",
    topic: "training",
    type: "two-choice",
    question: "Effective batch size = per-device batch × gradient accumulation steps × …",
    optionA: "Number of data-parallel devices",
    optionB: "Number of epochs",
    correct: "A",
    explanation: "Getting this wrong is why a run reproduces differently on a new cluster. Effective batch size, not per-device batch, is what your learning rate should be tuned against."
  },
  {
    id: "trn-017",
    topic: "training",
    type: "two-choice",
    question: "A learning curve where both training and validation loss plateau high suggests…",
    optionA: "Underfitting — capacity, features, or optimization is the limit",
    optionB: "Overfitting",
    correct: "A",
    explanation: "No gap and bad performance means the model can't represent or can't reach the solution. More regularization here makes things strictly worse."
  },
  {
    id: "trn-018",
    topic: "training",
    type: "true-false",
    question: "Validation loss and your target business metric can move in opposite directions.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Cross-entropy weights every example equally; your business doesn't. A model that gets slightly worse on the bulk of easy cases while improving on high-value ones can lose on loss and win on revenue."
  },

  /* ---------------------------------------------------------------------------
     METRIC LAYERS — which of the four is actually moving
     ------------------------------------------------------------------------ */
  {
    id: "tax-011",
    topic: "taxonomy",
    type: "two-choice",
    question: "A bank picks between two fraud models using Precision@5,000 on last quarter's labelled transactions. That number is a…",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "A",
    explanation: "Held-out historical data, no live traffic, rerunnable on every commit. Note the 5,000 comes from analyst capacity — the offline metric is shaped by a production constraint even though it never touches production."
  },
  {
    id: "tax-012",
    topic: "taxonomy",
    type: "two-choice",
    question: "After launch the same bank tracks manual-review yield: the share of reviewed alerts that turn out to be real fraud. Which family?",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "B",
    explanation: "Live traffic, real analysts, labels arriving late. It is the production echo of Precision@K — and when the two disagree, the held-out set is usually the stale one."
  },
  {
    id: "tax-013",
    topic: "taxonomy",
    type: "two-choice",
    question: "A search team trains with pairwise ranking loss and ships whichever model wins on NDCG@10. Which of the two is the training objective?",
    optionA: "The pairwise ranking loss",
    optionB: "NDCG@10",
    correct: "A",
    explanation: "NDCG contains a sort, so it has no useful gradient. You optimise a differentiable surrogate and let NDCG pick the winner. Training loss and offline metric being different functions is the normal case, not a smell."
  },
  {
    id: "tax-014",
    topic: "taxonomy",
    type: "true-false",
    question: "The cross-entropy minimised by gradient descent and the log loss on your validation set are the same formula.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Same quantity, two jobs. The training loss has to be differentiable; the offline metric only has to answer 'which model is better?'. Two names for one function is habit, not mathematics."
  },
  {
    id: "tax-015",
    topic: "taxonomy",
    type: "true-false",
    question: "Log loss is inherently an offline metric.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "Where you measure it decides. On a frozen validation split it is offline; computed weekly against outcomes that actually landed it is online. No formula knows which side of deployment it is sitting on."
  },

  /* ---------------------------------------------------------------------------
     ARITHMETIC — the confusion matrix, done by hand
     ------------------------------------------------------------------------ */
  {
    id: "off-043",
    topic: "offline · classification",
    type: "two-choice",
    question: "A fraud system sees 100,000 legitimate transactions and wrongly flags 300. The false-positive rate is…",
    optionA: "3%",
    optionB: "0.3%",
    correct: "B",
    explanation: "300 / 100,000. The denominator is the legitimate population, not the alert pile — that is what separates FPR from 1 minus precision, and why a 0.3% FPR can still leave most of your alerts junk."
  },
  {
    id: "off-044",
    topic: "offline · classification",
    type: "two-choice",
    question: "500 patients have the disease and the model finds 450. Recall and false-negative rate are…",
    optionA: "90% and 10%",
    optionB: "90% and 90%",
    correct: "A",
    explanation: "FNR is exactly 1 minus recall — the same fact from the other end. Try saying 'we miss one in ten sick patients' in the review instead of '90% recall' and watch the room react differently."
  },
  {
    id: "off-045",
    topic: "offline · classification",
    type: "two-choice",
    question: "Analysts review 2,000 flagged transactions and confirm 360 as fraud. Precision is…",
    optionA: "82%",
    optionB: "18%",
    correct: "B",
    explanation: "360 / 2,000. Four in five reviews are wasted, which sounds fatal until you price it: at $8 a review and $4,000 a catch, that queue prints money."
  },
  {
    id: "off-046",
    topic: "offline · classification",
    type: "two-choice",
    question: "Precision is 0.80 and recall is 0.50. F1 is closest to…",
    optionA: "0.62",
    optionB: "0.65",
    correct: "A",
    explanation: "2(0.8)(0.5) / 1.3 is about 0.615. The 0.65 is the arithmetic mean — the trap. F1 is harmonic, so it gets dragged toward the weaker number and strong precision cannot buy its way out."
  },
  {
    id: "off-047",
    topic: "offline · classification",
    type: "two-choice",
    question: "A missed fraud costs about $4,000; a false alert costs about $8. Reporting F1 as the headline metric…",
    optionA: "buries a 500:1 cost asymmetry",
    optionB: "balances the two errors correctly",
    correct: "A",
    explanation: "Weighting precision and recall equally is a claim about costs, and here it is off by a factor of five hundred. Score on expected dollars instead: cost of a miss times misses, plus cost of an alert times false alerts."
  },
  {
    id: "off-042",
    topic: "offline · regression",
    type: "two-choice",
    question: "You are predicting hotel prices in dollars and a teammate proposes cross-entropy as the loss. The objection is…",
    optionA: "It scores probabilities, not magnitudes",
    optionB: "It converges too slowly on skewed targets",
    correct: "A",
    explanation: "Cross-entropy asks how much probability mass you put on the true class, and a price has no classes. Reach for MSE, MAE, Huber, or quantile loss depending on whether outliers and asymmetry matter."
  },
  {
    id: "off-048",
    topic: "offline · regression",
    type: "true-false",
    question: "The quantile loss a forecaster trains on and the pinball loss it is scored with are the same function.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Same function, two names — the training and evaluation split again. The real decision is which quantile: the 90th for staffing and inventory, where running out costs more than overshooting."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — feature stores and pipelines
     ------------------------------------------------------------------------ */
  {
    id: "sys-001",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "The architectural split between an online and an offline feature store is really about…",
    optionA: "Streaming versus batch processing",
    optionB: "Millisecond single-entity reads versus high-throughput scans",
    correct: "B",
    explanation: "Redis-style online stores answer 'features for this one user, now' in single-digit milliseconds. Warehouse-style offline stores scan billions of rows to build a training set. Either can be fed by batch or stream — the access pattern is what differs."
  },
  {
    id: "sys-006",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "Point-in-time correctness in an offline feature store exists to…",
    optionA: "Stop training features containing post-event information",
    optionB: "Speed up queries by partitioning on date",
    correct: "A",
    explanation: "Join naively and 'total clicks' for a Tuesday event quietly includes Wednesday's clicks. The model looks brilliant offline and collapses in production, because at serving time the future is not available."
  },
  {
    id: "sys-022",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "A central feature registry prevents training–serving skew by…",
    optionA: "Storing model weights alongside the features",
    optionB: "Defining each feature once and compiling it for both paths",
    correct: "B",
    explanation: "The skew comes from a human rewriting a pandas transformation in Java and getting a null default or a rounding rule slightly wrong. One declarative definition, two generated implementations, no translation step left to get wrong."
  },
  {
    id: "sys-011",
    topic: "systems · pipelines",
    type: "two-choice",
    question: "'Clicks in the last five minutes' as a serving feature is typically produced by…",
    optionA: "A nightly warehouse batch job",
    optionB: "A stream engine reading a broker, writing to the online store",
    correct: "B",
    explanation: "Kafka carries the events, Flink holds the rolling window, the result lands in Redis before the next request needs it. A nightly job cannot express 'last five minutes' at all."
  },
  {
    id: "sys-015",
    topic: "systems · pipelines",
    type: "two-choice",
    question: "An on-demand feature is one that…",
    optionA: "Gets refreshed hourly by a stream job",
    optionB: "Must be computed at request time from data unique to that request",
    correct: "B",
    explanation: "Distance between the user's live GPS ping and the restaurant cannot exist before the request arrives. These are also the features most prone to training–serving skew, since the offline version has to reconstruct what the request would have carried."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — deployment and failure modes
     ------------------------------------------------------------------------ */
  {
    id: "sys-003",
    topic: "systems · deployment",
    type: "two-choice",
    question: "In a shadow deployment, what happens to the new model's prediction?",
    optionA: "It is shown to a small slice of live users",
    optionB: "It is logged for analysis and never shown to anyone",
    correct: "B",
    explanation: "Requests are mirrored to V2 while V1 still answers. You get production traffic, production features and real latency numbers at zero blast radius. What you cannot get is user response — nobody ever saw V2's output."
  },
  {
    id: "sys-020",
    topic: "systems · deployment",
    type: "two-choice",
    question: "A canary release typically starts by routing what share of traffic to the new model?",
    optionA: "1–5%",
    optionB: "About 50%",
    correct: "A",
    explanation: "Small enough that a catastrophic bug is a rounding error, large enough to surface one. You ramp on the way up. Fifty-fifty is an A/B test — a different tool answering a different question."
  },
  {
    id: "sys-010",
    topic: "systems · deployment",
    type: "two-choice",
    question: "The distinctive risk of A/B testing a model, versus shadow or canary, is…",
    optionA: "A bad model hits real business metrics for a large cohort",
    optionB: "It cannot measure revenue",
    correct: "A",
    explanation: "That exposure is the whole point — it is the only way to read causal business impact. But a 50/50 split means half your users live with V2's mistakes for the length of the test, which is why you canary first and A/B second."
  },
  {
    id: "sys-008",
    topic: "systems · deployment",
    type: "two-choice",
    question: "You are canarying a loan-default model whose real label takes six months. You evaluate it using…",
    optionA: "Short-term proxy labels, like a missed first payment",
    optionB: "Data drift metrics alone",
    correct: "A",
    explanation: "A correlated early signal catches a catastrophically broken model in days. It is a proxy and it will drift from the real thing — you still reconcile against true defaults later, you just do not block the release on them."
  },
  {
    id: "sys-002",
    topic: "systems · failures",
    type: "two-choice",
    question: "Your inference server slows down and callers start piling up on it. The pattern that stops the cascade is…",
    optionA: "A circuit breaker with a fallback",
    optionB: "Gradient accumulation",
    correct: "A",
    explanation: "Once latency or error rate crosses a threshold the breaker trips and traffic goes straight to something cheap and safe — cached popular items, a heuristic, last known good. Serving something mediocre instantly beats hanging every upstream service."
  },
  {
    id: "sys-013",
    topic: "systems · failures",
    type: "two-choice",
    question: "Your recommender runs out of memory during live inference. The usual culprit is…",
    optionA: "The training batch size is set too high",
    optionB: "Unbounded feature history pulled in for a single request",
    correct: "B",
    explanation: "One bot or power user with a million logged events, no truncation rule in the feature fetch, and the container dies. Cap history length at retrieval time — the model almost never needs more than the recent window."
  },
  {
    id: "sys-017",
    topic: "systems · failures",
    type: "two-choice",
    question: "Monitoring and feature logging are kept off the synchronous inference path so that…",
    optionA: "Drift detection becomes more accurate",
    optionB: "Logging problems cannot add latency or fail the prediction",
    correct: "B",
    explanation: "Write to a broker and let the monitoring pipeline consume at its own pace. Otherwise a slow analytics sink becomes a user-facing outage — the observability system taking down the thing it observes."
  },
  {
    id: "sys-023",
    topic: "systems · failures",
    type: "two-choice",
    question: "Gradient accumulation is the fix for…",
    optionA: "Latency spikes at serving time",
    optionB: "Training OOM when the batch you want exceeds VRAM",
    correct: "B",
    explanation: "Run four micro-batches of 32, sum the gradients, step once — near-equivalent to a batch of 128 without ever holding it in memory. It buys memory with wall-clock time, and does nothing whatsoever for inference."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — architecture and retrieval
     ------------------------------------------------------------------------ */
  {
    id: "sys-007",
    topic: "systems · architecture",
    type: "two-choice",
    question: "A brand-new item with zero interactions arrives in a two-tower retrieval system. What happens?",
    optionA: "It waits for the overnight retrain",
    optionB: "The item tower embeds its metadata and it is immediately scorable",
    correct: "B",
    explanation: "That is the main reason to pay the two-tower tax. If the item tower consumes title, description and image rather than an ID lookup, a cold item lands in the same vector space as everything else the moment it exists."
  },
  {
    id: "sys-016",
    topic: "systems · architecture",
    type: "two-choice",
    question: "Pulling 1,000 candidates from a 10-million-item catalogue in under 100 ms calls for…",
    optionA: "Scoring every item with a light model",
    optionB: "Approximate nearest-neighbour search over embeddings",
    correct: "B",
    explanation: "Ten million scores per request is not happening at any model size. ANN indexes trade exactness for sub-linear lookup — you accept missing a few true neighbours to get the shortlist the expensive ranker then re-scores."
  },
  {
    id: "sys-009",
    topic: "systems · architecture",
    type: "two-choice",
    question: "Ad CTR prediction under a 50 ms budget. Which stack?",
    optionA: "An LLM doing zero-shot classification",
    optionB: "A factorisation-machine hybrid with features from an in-memory store",
    correct: "B",
    explanation: "DeepFM-style models are built for exactly this: sparse categorical crosses at tiny inference cost. The latency usually is not the model anyway — it is the feature fetch, which is why those features live in Redis."
  },
  {
    id: "sys-024",
    topic: "systems · architecture",
    type: "two-choice",
    question: "In a RAG pipeline, the cross-encoder re-ranker exists to…",
    optionA: "Precisely re-order the top few dozen retrieved chunks",
    optionB: "Fetch the initial thousands of candidates",
    correct: "A",
    explanation: "Bi-encoders embed query and document separately, which is what makes them indexable and approximate. A cross-encoder reads both together — far more accurate, far too slow for the whole corpus, exactly right for a shortlist."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — feedback loops, bias, and cold start
     ------------------------------------------------------------------------ */
  {
    id: "sys-004",
    topic: "systems · bias",
    type: "two-choice",
    question: "Inverse propensity weighting corrects position bias by…",
    optionA: "Dividing a clicked item's loss by the chance it was examined",
    optionB: "Dropping all rank-1 clicks from training",
    correct: "A",
    explanation: "A click at rank 9 is rare because fewer people look that far, not because the item is worse. Dividing by the examination probability scales those clicks back up to what they would have been had everyone seen them."
  },
  {
    id: "sys-025",
    topic: "systems · bias",
    type: "two-choice",
    question: "IPW destabilises training when propensities get tiny. The standard fix is…",
    optionA: "Add more RAM",
    optionB: "Clip propensities at a floor",
    correct: "B",
    explanation: "A propensity of 0.001 turns one click into a 1000x weight, and takes the gradient step with it. Clipping caps the multiplier — you trade a little residual bias for a model that actually converges."
  },
  {
    id: "sys-012",
    topic: "systems · bias",
    type: "two-choice",
    question: "Randomising the order of identical items is the gold standard for measuring position bias because…",
    optionA: "It isolates position from relevance",
    optionB: "It requires no engineering work",
    correct: "A",
    explanation: "If two items are interchangeable and swapping their slots changes CTR, the difference is position and nothing else. It costs you some ranking quality on the randomised traffic — that is the price of an unbiased estimate."
  },
  {
    id: "sys-018",
    topic: "systems · bias",
    type: "two-choice",
    question: "Expectation-maximisation estimates position bias from historical logs by…",
    optionA: "Shuffling live results for real users",
    optionB: "Iteratively separating probability of examination from relevance",
    correct: "B",
    explanation: "You observe clicks; you never observe whether the user looked. EM alternates between guessing examination probabilities and re-estimating relevance until it settles. Cheaper than randomisation because it touches no live traffic — and it leans harder on its own assumptions."
  },
  {
    id: "sys-014",
    topic: "systems · bias",
    type: "two-choice",
    question: "The long-run damage from a feed that only exploits known preferences is…",
    optionA: "New content starves and users eventually get bored",
    optionB: "Inference latency climbs",
    correct: "A",
    explanation: "Pure exploitation looks excellent on next-session engagement while hollowing out the catalogue underneath it. Nothing new gets impressions, so nothing new gets data, so the model never learns that it was any good."
  },
  {
    id: "sys-005",
    topic: "systems · cold start",
    type: "two-choice",
    question: "You need CTR data for items nobody has ever seen. The deliberate strategy is…",
    optionA: "Matrix factorisation over the existing interaction matrix",
    optionB: "Bandit exploration — spend a slice of traffic on unknowns",
    correct: "B",
    explanation: "Factorisation can only interpolate from interactions that exist, and a brand-new item has none. Epsilon-greedy or UCB pays a small, bounded engagement cost now to buy the data that makes the item rankable later."
  },
  {
    id: "sys-019",
    topic: "systems · cold start",
    type: "two-choice",
    question: "Asking a new user to pick five artists at signup solves user cold start by…",
    optionA: "Falling back to device metadata",
    optionB: "Buying an explicit preference vector before the first feed",
    correct: "B",
    explanation: "It converts an unanswerable question into a short form. The cost is friction at the highest-drop-off moment in the funnel, which is why it is usually five taps and skippable."
  },

  /* ---------------------------------------------------------------------------
     MORE METRIC CHOICES — picking the right one for the job
     ------------------------------------------------------------------------ */
  {
    id: "off-217",
    topic: "offline · ranking",
    type: "two-choice",
    question: "You need one offline metric for a search system where the order of the top results is the whole game. Reach for…",
    optionA: "ROC-AUC",
    optionB: "NDCG",
    correct: "B",
    explanation: "AUC scores whether relevant beats irrelevant anywhere in the list. NDCG discounts by position, so the same good result counts for far less at rank 8 than at rank 1. Accuracy and MSE are not in the conversation — nothing here is a class or a magnitude."
  },
  {
    id: "off-218",
    topic: "offline · ranking",
    type: "two-choice",
    question: "'People you may know' graph recommendations often weight recall heavily because…",
    optionA: "A missed real-world friend costs network growth",
    optionB: "Precision cannot be computed on graphs",
    correct: "A",
    explanation: "An irrelevant suggestion is a shrug; a connection never surfaced may never happen at all. Social products compound on graph density, so false negatives get charged against long-term growth, not just this session."
  },
  {
    id: "onl-107",
    topic: "online · product",
    type: "two-choice",
    question: "Your business metric is ad revenue on a video feed. Which model-facing metric tracks it best?",
    optionA: "CTR alone",
    optionB: "Total watch time",
    correct: "B",
    explanation: "CTR only buys the start of a session; mid-roll inventory scales with minutes watched. Optimising clicks alone reliably produces thumbnail bait — high CTR, short sessions, less revenue than you started with."
  },
  {
    id: "mon-009",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Which kind of drift can you only confirm once ground-truth labels arrive?",
    optionA: "Covariate shift",
    optionB: "Concept drift",
    correct: "B",
    explanation: "Input and prediction distributions are observable the moment traffic lands. Concept drift is a change in P(y|x) — the relationship itself — and you cannot see that the mapping moved until you learn what actually happened."
  }

];

/* Expose for the plain <script> tag in index.html (no modules, no build step). */
window.QUESTIONS = QUESTIONS;
