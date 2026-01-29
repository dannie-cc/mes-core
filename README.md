# mes-platform

**mes-platform** is a **lightweight, modular Manufacturing Execution System (MES)** designed as a **DDD-aligned modular monolith**.

It aims to provide a solid, extensible foundation for:
* Small to mid-sized manufacturing environments
* Internal production tracking and execution
* Learning and experimenting with MES domain modeling
* Building custom MES workflows on top of a clean architecture

The project is **source-available** and **free for non-commercial use**.

---

## Goals & Philosophy
* 🧱 **Modular Monolith** – clear bounded contexts without microservice overhead
* 🧠 **Domain-Driven Design (DDD)** – domain-first modeling, explicit boundaries
* 🔌 **Extensible** – designed to be customized per factory or workflow
* ⚙️ **Pragmatic MES** – focused on execution, not ERP-level complexity
* 🚀 **Future-ready** – architecture that can evolve into hosted or enterprise offerings

---

## Scope (Initial)

Planned or intended functional areas include:
* Production orders & execution
* Work centers / machines
* Routing & operation tracking
* Basic quality checks
* Status and progress visibility
* Audit-friendly state transitions

> ⚠️ This is **not** a full ERP and intentionally avoids accounting, finance, or HR concerns.

---

## Architecture Overview
* **Architecture**: Modular Monolith
* **Design approach**: Domain-Driven Design (DDD)
* **Bounded contexts**: Implemented as isolated modules
* **Dependency direction**: Domain → Application → Infrastructure
* **Integration style**: Internal events / messaging (no hard coupling)

The goal is to keep **domain logic independent** from frameworks and infrastructure.

---

## Getting Started

> 🚧 The project is under active development.
> Setup instructions will be added once the initial module structure stabilizes.

Planned stack (subject to refinement):
* Node.js (LTS)
* NestJS
* TypeScript
* Relational database (TBD)
* WebSocket / real-time updates (where applicable)

---

## Usage

At this stage, the project is intended for:
* Code exploration
* Architectural reference
* Early adopters experimenting with MES concepts

Usage examples and API documentation will be added incrementally.

---

## Roadmap (High-Level)
* [ ] Define core domain modules (Production, Routing, Quality)
* [ ] Establish base module template & boundaries
* [ ] Introduce authentication & authorization
* [ ] Add basic execution & status tracking
* [ ] Publish architectural guidelines
* [ ] Prepare first tagged public release

---

## Contributing

Contributions are welcome **for non-commercial use cases**.

Before contributing:
* Keep changes aligned with DDD principles
* Avoid introducing framework-specific logic into domain layers
* Open an issue before large structural changes

By contributing, you agree that:
* Your contributions may be included in future commercial versions
* You grant the project owner the right to relicense contributions if needed

(Contributor guidelines will be expanded later.)

---

## License

This project is **source-available** and licensed under the
**Non-Commercial Source-Available License**.

You are free to:
* Use the software internally
* Fork and modify the code
* Experiment and build upon it for non-commercial purposes

You may **NOT**:
* Sell this software or derivative works
* Offer it as a paid service (SaaS, hosting, managed MES)
* Include it in a commercial product

If you are interested in:
* Commercial usage
* Enterprise licensing
* Hosted or supported versions

Please contact the author for a commercial license.

See the [LICENSE](./LICENSE) file for full details.

---

## Project Status

🟡 **Early development / public foundation**

The project is actively evolving.
APIs, module boundaries, and internal structure may change until a stable release is published.
