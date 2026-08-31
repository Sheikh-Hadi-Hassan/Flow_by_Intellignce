# Local Model Evaluation Plan v0.1

## Principle

Do not train first and evaluate later. v0.1 creates contracts, ontology,
benchmark data, and an evaluation path.

## Candidate Matrix

| Candidate                     | Role      | License                               | Notes                                                                                            |
| ----------------------------- | --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Qwen3-4B / Qwen3-4B-Instruct  | Primary   | Apache-2.0 on public Qwen model pages | Strong multilingual and agent/tool hypothesis to benchmark first.                                |
| Phi-4-mini-instruct           | Secondary | Microsoft model license               | Lightweight instruction model with long context claims; evaluate license fit before product use. |
| IBM Granite 4.0 Tiny / H Tiny | Secondary | IBM Granite model family              | Tiny/local enterprise-oriented candidate; verify exact variant and license before use.           |

Sources reviewed:

- https://huggingface.co/Qwen/Qwen3-4B
- https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507
- https://huggingface.co/microsoft/Phi-4-mini-instruct
- https://www.ibm.com/new/announcements/ibm-granite-4-0-hyper-efficient-high-performance-hybrid-models
- https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md

## Machine Constraint

Detected RAM: 8 GB. Do not start local fine-tuning on this machine without a
separate resource plan. Even quantized inference should be tested carefully.

## MLX Path

MLX-LM supports LoRA/QLoRA workflows for supported model families. Qwen-family
support is promising, but the exact Qwen3-4B MLX variant must be verified
before downloading. Dataset format should follow instruction examples with
input, language, intent, entities, action, capability, missing fields, and risk.

## Training Strategy

Stage 0: Prompt + ontology + deterministic mapping

Stage 1: Evaluation dataset

Stage 2: Synthetic business instruction dataset

Stage 3: Human-reviewed examples

Stage 4: LoRA / QLoRA fine-tuning

Stage 5: Offline benchmark

Stage 6: Shadow evaluation

Stage 7: Controlled production use

## Recommendation

Train now: NO.

First benchmark deterministic routing plus local intent classification using
the v0.1 dataset.
