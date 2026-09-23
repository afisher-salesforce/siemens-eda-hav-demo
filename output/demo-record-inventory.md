# Siemens EDA HAV Demo — Salesforce Record Inventory

> **Org Instance:** `storm-db63fb470328c9.my.salesforce.com`
> **Base URL:** `https://storm-db63fb470328c9.my.salesforce.com/`
> **Last Updated:** September 23, 2026

This document catalogs all Salesforce records created for the Siemens EDA Hardware-as-a-Value (HAV) demo, organized by object type. Each record includes a direct hyperlink to the Salesforce record and annotations indicating which of the six demo vignettes it supports.

---

## Vignette Reference Key

| # | Title | Theme |
|---|-------|-------|
| V1 | The Order That Almost Didn't Close | Automated loan-to-sale conversion; trade compliance screening |
| V2 | The Capacity Nobody Could See | Real-time colocation rack/capacity planning |
| V3 | The Spreadsheet That Owns the Quarter Close | Unified financial intelligence; COGS reconciliation |
| V4 | The Traveler That Traveled by Email | Automated order fulfillment workflows (digital travelers) |
| V5 | The Platform That Connects It All | Unified data model across assets, orders, contracts |
| V6 | From Heroic Manual Efforts to Closed-Loop Automation | Real-time telemetry; closed-loop field service |

---

## 1. Accounts (10 EDA-Relevant)

| Name | Id | Link | Industry | Country | Embargo Flag | Vignette(s) |
|------|----|------|----------|---------|--------------|-------------|
| AMD | 001Wt00001m2y0sIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0sIAA) | Semiconductor | USA | No | V2, V5 |
| Apex Semiconductor | 001Wt00001k2oLtIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001k2oLtIAI) | Semiconductors | — | No | V1, V2, V4, V5, V6 |
| Broadcom | 001Wt00001m2y0qIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0qIAA) | Semiconductor | USA | No | V2, V5 |
| Horizon Microelectronics | 001Wt00001m1uC6IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m1uC6IAI) | Semiconductors | — | No | V1 (Trade Compliance) |
| Intel | 001Wt00001m2y0pIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0pIAA) | Semiconductor | USA | No | V2, V5, V6 |
| NVIDIA | 001Wt00001k2oDpIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001k2oDpIAI) | Semiconductors | — | No | V2, V5, V6 |
| Pinnacle Chip Design | 001Wt00001k2j1GIAQ | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001k2j1GIAQ) | Semiconductors | — | No | V1, V2, V4 |
| Qualcomm | 001Wt00001m2y0rIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0rIAA) | Semiconductor | USA | No | V2, V5 |
| Samsung Semiconductor | 001Wt00001m2y0oIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0oIAA) | Semiconductor | South Korea | No | V1, V2, V4, V5, V6 |
| Siemens EDA | 001Wt00001k2mrzIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001k2mrzIAA) | Electronics | — | No | V2, V3, V5 (Internal) |
| TSMC | 001Wt00001m2y0nIAA | [Open](https://storm-db63fb470328c9.my.salesforce.com/001Wt00001m2y0nIAA) | Semiconductor | Taiwan | No | V2, V5 |

---

## 2. Products — EDA Software (7)

All EDA software products are dual-use controlled under ECCN 3D002.

| Name | Id | Link | ECCN Code | Dual-Use | Vignette(s) |
|------|----|------|-----------|----------|-------------|
| Calibre nmDRC | 01tWt00000Fd7dhIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7dhIAB) | 3D002.a | Yes | V1, V4 |
| Calibre nmLVS | 01tWt00000Fd7diIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7diIAB) | 3D002.a | Yes | V1 |
| Catapult HLS | 01tWt00000Fd7dmIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7dmIAB) | 3D002.f | Yes | V3 |
| ModelSim SE | 01tWt00000Fd7dlIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7dlIAB) | 3D002.e | Yes | V3 |
| Precision RTL Synthesis | 01tWt00000Fd7dnIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7dnIAB) | 3D002.g | Yes | V3 |
| Questa Advanced Simulator | 01tWt00000Fd7djIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7djIAB) | 3D002.c | Yes | V3 |
| Xpedition Enterprise | 01tWt00000Fd7dkIAB | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fd7dkIAB) | 3D002.d | Yes | V3 |

---

## 3. Products — Emulation Hardware (7)

| Name | Id | Link | Product Code | Family | Vignette(s) |
|------|----|------|-------------|--------|-------------|
| Veloce Strato CS | 01tWt00000FKmcXIAT | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000FKmcXIAT) | VEL-STRATO | Emulation Systems | V2, V5, V6 |
| Primo CS | 01tWt00000Fc2jJIAR | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fc2jJIAR) | PRM-CS | Emulation Systems | V2, V5 |
| proFPGA CS | 01tWt00000Fc2jKIAR | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000Fc2jKIAR) | PRO-FPGA-CS | Emulation Systems | V2, V5 |
| Tower Assembly | 01tWt00000FKgFVIA1 | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000FKgFVIA1) | VEL-TWR-001 | Assemblies | V2, V5, V6 |
| Emulation Blade | 01tWt00000FKme9IAD | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000FKme9IAD) | VEL-BLD-001 | Blades | V6 |
| Emulation Blade — Gen2 (OEM) | 01tWt00000FVgaDIAT | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000FVgaDIAT) | VEL-BLD-002 | Blades | V6 |
| Emulation Blade — Gen3 (OEM) | 01tWt00000FVgaEIAT | [Open](https://storm-db63fb470328c9.my.salesforce.com/01tWt00000FVgaEIAT) | VEL-BLD-003 | Blades | V6 |

---

## 4. Assets — Emulation Fleet (161 total)

> **Hierarchy Note:** All fleet assets now participate in a physical hierarchy using two custom fields:
> - **`Asset_Tier__c`** — Picklist: Facility, Rack, Blade, Module, Card
> - **`Parent_Asset__c`** — Self-referencing lookup to Asset (parent in the hierarchy)
>
> The hierarchy is: **Facility → Rack → Blade** (with Module and Card tiers available for sub-blade components). Existing "Tower" and sub-component assets (modules, PSUs, cooling) retain no tier assignment.

### 4A. Apex Semiconductor (8 assets)

| Name | Id | Link | Serial Number | Status | Product | Vignette(s) |
|------|----|------|--------------|--------|---------|-------------|
| Veloce Strato CS — Tower T-101 | 02iWt000005AWYPIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWYPIA4) | VEL-TWR-101 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-102 | 02iWt000005AWa1IAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWa1IAG) | VEL-TWR-102 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-103 | 02iWt000005AWbdIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWbdIAG) | VEL-TWR-103 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-104 | 02iWt000005AWdFIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWdFIAW) | VEL-TWR-104 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-105 | 02iWt000005AWerIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWerIAG) | VEL-TWR-105 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-106 | 02iWt000005AWgTIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWgTIAW) | VEL-TWR-106 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-107 | 02iWt000005AWi5IAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWi5IAG) | VEL-TWR-107 | Installed | Tower Assembly | V2, V5, V6 |
| Veloce Strato CS — Tower T-108 | 02iWt000005AW8cIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW8cIAG) | VEL-TWR-108 | Installed | Tower Assembly | V2, V5, V6 |

### 4B. NVIDIA (76 assets)

**Tower Fleet (28 towers — T-001 through T-027 + T-044):**

| Name | Id | Link | Serial Number | Status | Vignette(s) |
|------|----|------|--------------|--------|-------------|
| Veloce Strato CS — Tower T-001 | 02iWt000005AVqrIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVqrIAG) | VEL-TWR-001 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-002 | 02iWt000005AVsTIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVsTIAW) | VEL-TWR-002 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-003 | 02iWt000005AVu5IAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVu5IAG) | VEL-TWR-003 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-004 | 02iWt000005AVvhIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVvhIAG) | VEL-TWR-004 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-005 | 02iWt000005AVxJIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVxJIAW) | VEL-TWR-005 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-006 | 02iWt000005AVyvIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AVyvIAG) | VEL-TWR-006 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-007 | 02iWt000005AW0XIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW0XIAW) | VEL-TWR-007 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-008 | 02iWt000005AW29IAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW29IAG) | VEL-TWR-008 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-009 | 02iWt000005AW3lIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW3lIAG) | VEL-TWR-009 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-010 | 02iWt000005AW5NIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW5NIAW) | VEL-TWR-010 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-011 | 02iWt000005AW6zIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW6zIAG) | VEL-TWR-011 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-012 | 02iWt000005AW8bIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AW8bIAG) | VEL-TWR-012 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-013 | 02iWt000005AWADIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWADIA4) | VEL-TWR-013 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-014 | 02iWt000005AWBpIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWBpIAO) | VEL-TWR-014 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-015 | 02iWt000005AWDRIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWDRIA4) | VEL-TWR-015 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-016 | 02iWt000005AWF3IAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWF3IAO) | VEL-TWR-016 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-017 | 02iWt000005AWGfIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWGfIAO) | VEL-TWR-017 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-018 | 02iWt000005AWIHIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWIHIA4) | VEL-TWR-018 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-019 | 02iWt000005AWJtIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWJtIAO) | VEL-TWR-019 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-020 | 02iWt000005AWLVIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWLVIA4) | VEL-TWR-020 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-021 | 02iWt000005AWN7IAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWN7IAO) | VEL-TWR-021 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-022 | 02iWt000005AWOjIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWOjIAO) | VEL-TWR-022 | Installed | V2, V5 |
| Veloce Strato CS — Tower T-023 | 02iWt000005AWQLIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWQLIA4) | VEL-STR-2024-0887 | Loaner | V1, V2, V5 |
| Veloce Strato CS — Tower T-024 | 02iWt000005AWRxIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWRxIAO) | VEL-STR-2024-0888 | Loaner | V1, V2, V5 |
| Veloce Strato CS — Tower T-025 | 02iWt000005AWTZIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWTZIA4) | VEL-STR-2024-0889 | Loaner | V1, V2, V5 |
| Veloce Strato CS — Tower T-026 | 02iWt000005AWVBIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWVBIA4) | VEL-STR-2024-0890 | Loaner | V1, V2, V5 |
| Veloce Strato CS — Tower T-027 | 02iWt000005AWWnIAO | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWWnIAO) | VEL-STR-2024-0891 | Loaner | V1, V2, V5 |
| Veloce Strato CS — Tower T-044 | 02iWt000005EGDJIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDJIA4) | VEL-TWR-044 | Installed | V2, V5, V6 |

**Tower T-044 Sub-Components (NVIDIA):**

| Name | Id | Link | Serial Number | Status | Vignette(s) |
|------|----|------|--------------|--------|-------------|
| Emulation Blade BLD-044-A1 | 02iWt000005EGDMIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDMIA4) | VEL-BLD-044-A1 | Installed | V6 |
| Emulation Blade BLD-044-A2 | 02iWt000005EGDNIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDNIA4) | VEL-BLD-044-A2 | Installed | V6 |
| Emulation Blade BLD-044-A3 | 02iWt000005EGDOIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDOIA4) | VEL-BLD-044-A3 | Installed | V6 |
| Emulation Blade BLD-044-A4 | 02iWt000005EGDPIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDPIA4) | VEL-BLD-044-A4 | Installed | V6 |
| Emulation Blade BLD-044-B1 | 02iWt000005EGDQIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDQIA4) | VEL-BLD-044-B1 | Installed | V6 |
| Emulation Blade BLD-044-B2 | 02iWt000005EGDRIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDRIA4) | VEL-BLD-044-B2 | Installed | V6 |
| Emulation Blade BLD-044-B3 | 02iWt000005EGDSIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDSIA4) | VEL-BLD-044-B3 | Installed | V6 |
| Emulation Blade BLD-044-B4 | 02iWt000005EGDTIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDTIA4) | VEL-BLD-044-B4 | Installed | V6 |
| Veloce Module M-044-A | 02iWt000005EGDKIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDKIA4) | VEL-MOD-044-A | Installed | V6 |
| Veloce Module M-044-B | 02iWt000005EGDLIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDLIA4) | VEL-MOD-044-B | Installed | V6 |
| Power Supply Unit — Tower T-044 | 02iWt000005EGDUIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDUIA4) | VEL-PSU-044 | Installed | V6 |
| Cooling System — Tower T-044 | 02iWt000005EGDVIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005EGDVIA4) | VEL-COOL-044 | Installed | V6 |

**NVIDIA JK37 Emulator (35 assets):**

| Name | Id | Link | Serial Number | Status | Vignette(s) |
|------|----|------|--------------|--------|-------------|
| Veloce Strato T — Emulator JK37 | 02iWt000005GibhIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005GibhIAC) | VEL-JK37 | Installed | V2, V5, V6 |
| JK37 Module 0 | 02iWt000005GibiIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005GibiIAC) | VEL-MOD-JK37-M0 | Installed | V6 |
| JK37 Module 1 | 02iWt000005GibjIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005GibjIAC) | VEL-MOD-JK37-M1 | Installed | V6 |
| Emulation Blade JK37-0000 through JK37-0032 | 02iWt000005GibkIAC – 02iWt000005GicGIAS | [Open first](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005GibkIAC) | VEL-BLD-JK37-0000 – 0032 | Installed (0032 = Spare) | V6 |

### 4C. Pinnacle Chip Design (2 assets)

| Name | Id | Link | Serial Number | Status | Product | Vignette(s) |
|------|----|------|--------------|--------|---------|-------------|
| Veloce Strato CS — Tower T-201 | 02iWt000005AUDGIA4 | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AUDGIA4) | VEL-TWR-201 | Installed | Tower Assembly | V2, V5 |
| Veloce Strato CS — Tower T-202 | 02iWt000005AWjhIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWjhIAG) | VEL-TWR-202 | Installed | Tower Assembly | V2, V5 |

### 4D. Siemens EDA — Spare Pool (6 assets)

| Name | Id | Link | Serial Number | Status | Product | Vignette(s) |
|------|----|------|--------------|--------|---------|-------------|
| PF-MUC1-001 | 02iWt000005Itl7IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl7IAC) | SN-2024-70201 | Installed | proFPGA CS | V2 |
| PF-MUC1-002 | 02iWt000005Itl8IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl8IAC) | SN-2024-70202 | Installed | proFPGA CS | V2 |
| Tower T-301 | 02iWt000005AWlJIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWlJIAW) | VEL-TWR-301 | Available | Tower Assembly | V2 |
| Tower T-302 | 02iWt000005AWmvIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWmvIAG) | VEL-TWR-302 | Available | Tower Assembly | V2 |
| Tower T-303 | 02iWt000005AWoXIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWoXIAW) | VEL-TWR-303 | Available | Tower Assembly | V2 |
| Tower T-304 | 02iWt000005AWq9IAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005AWq9IAG) | VEL-TWR-304 | Available | Tower Assembly | V2 |

### 4E. Field Assets — Multi-Customer (Veloce Strato, Primo, proFPGA)

| Name | Id | Link | Serial Number | Status | Account | Product | Vignette(s) |
|------|----|------|--------------|--------|---------|---------|-------------|
| VS-SJ1-001 | 02iWt000005ItkjIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkjIAC) | SN-2024-48201 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| VS-SJ1-002 | 02iWt000005ItkkIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkkIAC) | SN-2024-48202 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| VS-SJ1-003 | 02iWt000005ItklIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItklIAC) | SN-2024-48203 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| PM-SJ1-004 | 02iWt000005ItkmIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkmIAC) | SN-2024-48204 | Installed | TSMC | Primo CS | V2, V5 |
| VS-SJ1-005 | 02iWt000005ItknIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItknIAC) | SN-2024-48205 | Installed | Intel | Veloce Strato CS | V2, V6 |
| VS-SJ1-006 | 02iWt000005ItkoIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkoIAC) | SN-2024-48206 | Installed | Intel | Veloce Strato CS | V2, V5 |
| VS-SJ1-007 | 02iWt000005ItkpIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkpIAC) | SN-2024-48207 | Installed | Broadcom | Veloce Strato CS | V2, V5 |
| PM-SJ1-008 | 02iWt000005ItkqIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkqIAC) | SN-2024-48208 | Shipped | Broadcom | Primo CS | V2 |
| VS-AUS1-001 | 02iWt000005ItkrIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkrIAC) | SN-2024-51301 | Installed | Qualcomm | Veloce Strato CS | V2, V5 |
| PM-AUS1-002 | 02iWt000005ItksIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItksIAC) | SN-2024-51302 | Installed | Qualcomm | Primo CS | V2, V5 |
| VS-AUS1-003 | 02iWt000005ItktIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItktIAC) | SN-2024-51303 | Installed | Qualcomm | Veloce Strato CS | V2, V5 |
| VS-AUS1-004 | 02iWt000005ItkuIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkuIAC) | SN-2024-51304 | Installed | AMD | Veloce Strato CS | V2, V5 |
| PM-AUS1-005 | 02iWt000005ItkvIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkvIAC) | SN-2024-51305 | Installed | AMD | Primo CS | V2, V5 |
| PM-AUS1-006 | 02iWt000005ItkwIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkwIAC) | SN-2024-51306 | Purchased | AMD | Primo CS | V2 |
| VS-HSC1-001 | 02iWt000005ItkxIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkxIAC) | SN-2024-60101 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| VS-HSC1-002 | 02iWt000005ItkyIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkyIAC) | SN-2024-60102 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| VS-HSC1-003 | 02iWt000005ItkzIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItkzIAC) | SN-2024-60103 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| VS-HSC1-004 | 02iWt000005Itl0IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl0IAC) | SN-2024-60104 | Installed | TSMC | Veloce Strato CS | V2, V5 |
| PM-HSC1-005 | 02iWt000005Itl1IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl1IAC) | SN-2024-60105 | Installed | TSMC | Primo CS | V2, V5 |
| PM-HSC1-006 | 02iWt000005Itl2IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl2IAC) | SN-2024-60106 | Installed | TSMC | Primo CS | V2, V5 |
| VS-HSC1-007 | 02iWt000005Itl3IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl3IAC) | SN-2024-60107 | Installed | Samsung | Veloce Strato CS | V2, V5 |
| VS-HSC1-008 | 02iWt000005Itl4IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl4IAC) | SN-2024-60108 | Installed | Samsung | Veloce Strato CS | V2, V5 |
| VS-HSC1-009 | 02iWt000005Itl5IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl5IAC) | SN-2024-60109 | Installed | Samsung | Veloce Strato CS | V2, V5 |
| PM-HSC1-010 | 02iWt000005Itl6IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl6IAC) | SN-2024-60110 | Shipped | Samsung | Primo CS | V2 |
| PM-BLR1-001 | 02iWt000005ItlGIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlGIAS) | SN-2024-90401 | Installed | Intel | Primo CS | V2, V5 |
| PF-BLR1-002 | 02iWt000005ItlHIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlHIAS) | SN-2025-90402 | Installed | Intel | proFPGA CS | V2, V5 |
| PF-BLR1-003 | 02iWt000005ItlIIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlIIAS) | SN-2025-90403 | Installed | Qualcomm | proFPGA CS | V2, V5 |
| VS-SEL1-001 | 02iWt000005ItlBIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlBIAS) | SN-2024-80301 | Installed | Samsung | Veloce Strato CS | V2, V5, V6 |
| VS-SEL1-002 | 02iWt000005ItlCIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlCIAS) | SN-2024-80302 | Installed | Samsung | Veloce Strato CS | V2, V5 |
| VS-SEL1-003 | 02iWt000005ItlDIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlDIAS) | SN-2024-80303 | Installed | Samsung | Veloce Strato CS | V2, V5 |
| PM-SEL1-004 | 02iWt000005ItlEIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlEIAS) | SN-2024-80304 | Installed | Samsung | Primo CS | V2, V5 |
| PM-SEL1-005 | 02iWt000005ItlFIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlFIAS) | SN-2024-80305 | Installed | Samsung | Primo CS | V2, V5 |
| PF-MUC1-003 | 02iWt000005Itl9IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005Itl9IAC) | SN-2024-70203 | Installed | Broadcom | proFPGA CS | V2, V5 |
| VS-MUC1-004 | 02iWt000005ItlAIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005ItlAIAS) | SN-2024-70204 | Installed | Broadcom | Veloce Strato CS | V2, V5 |

---

## 5. Sales Agreements / Orders (7 EDA-Relevant)

| Name | Id | Link | Status | Account | Start Date | End Date | Vignette(s) |
|------|----|------|--------|---------|-----------|----------|-------------|
| Apex Semiconductor — EaaS Annual Agreement FY2026 | 0YAWt000000wN2fOAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000wN2fOAE) | Activated | Apex Semiconductor | 2026-01-01 | 2026-12-31 | V1, V4 |
| NVIDIA Corporation — EaaS Annual Agreement FY2026 | 0YAWt000000wN13OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000wN13OAE) | Activated | NVIDIA | — | — | V1, V4 |
| Pinnacle Chip Design — EaaS Agreement (Expiring) | 0YAWt000000wN4HOAU | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000wN4HOAU) | Activated | Pinnacle Chip Design | 2025-04-01 | 2027-03-31 | V1, V4 |
| SA-00008 | 0YAWt000000zyVVOAY | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000zyVVOAY) | Draft | Apex Semiconductor | 2025-01-15 | 2025-01-21 | V1, V4 |
| SA-00012 | 0YAWt000000zyVWOAY | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000zyVWOAY) | Draft | NVIDIA | — | — | V4 |
| SA-00015 | 0YAWt000000zyVXOAY | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000zyVXOAY) | Draft | Samsung Semiconductor | 2025-06-01 | 2025-06-07 | V1, V4 |
| Test SA | 0YAWt000000wMwDOAU | [Open](https://storm-db63fb470328c9.my.salesforce.com/0YAWt000000wMwDOAU) | Draft | NVIDIA | — | — | — |

---

## 6. Work Orders (7 EDA-Relevant)

| WO # | Id | Link | Status | Account | Subject | Asset | Vignette(s) |
|------|----|------|--------|---------|---------|-------|-------------|
| 00000587 | 0WOWt0000074Kc3OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000074Kc3OAE) | Completed | NVIDIA | Emergency Blade Swap — BLD-044-A1 | Emulation Blade BLD-044-A1 | V6 |
| 00000588 | 0WOWt0000074Kc4OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000074Kc4OAE) | Completed | NVIDIA | Critical power fluctuation — Blade BLD-044-A1 | Emulation Blade BLD-044-A1 | V6 |
| 00000590 | 0WOWt0000077Ua1OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000077Ua1OAE) | Completed | TSMC | Blade replacement — overheating slot 3 | VS-SJ1-001 | V6 |
| 00000591 | 0WOWt0000077Ua2OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000077Ua2OAE) | In Progress | Intel | Firmware upgrade to Veloce OS v4.2.1 | VS-SJ1-005 | V6 |
| 00000606 | 0WOWt0000078Eg9OAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000078Eg9OAE) | In Progress | Samsung | Firmware update — Veloce Strato v3.2 patch | VS-SEL1-001 | V6 |
| 00000607 | 0WOWt0000078EgAOAU | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000078EgAOAU) | New | Samsung | Firmware update — Veloce Strato v3.2 patch | VS-SEL1-001 | V6 |
| 00000619 | 0WOWt0000078EhiOAE | [Open](https://storm-db63fb470328c9.my.salesforce.com/0WOWt0000078EhiOAE) | New | Samsung | Firmware update — Veloce Strato v3.2 patch | VS-SEL1-001 | V6 |

---

## 7. Compliance Records (1)

| Name | Id | Link | Assessment Outcome | Account | Vignette(s) |
|------|----|------|--------------------|---------|-------------|
| CR-00004 | a9fWt0000000LkPIAU | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9fWt0000000LkPIAU) | Clear | Horizon Microelectronics | V1 (Trade Compliance) |

---

## 8. Embargo Countries (12)

| Name | Id | Link | Country | Code | Embargoed | Vignette(s) |
|------|----|------|---------|------|-----------|-------------|
| EC-00000 | a9hWt0000000cGbIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGbIAI) | North Korea | KP | Yes | V1 |
| EC-00001 | a9hWt0000000cGcIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGcIAI) | Iran | IR | Yes | V1 |
| EC-00002 | a9hWt0000000cGdIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGdIAI) | Russia | RU | Yes | V1 |
| EC-00003 | a9hWt0000000cGeIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGeIAI) | Syria | SY | Yes | V1 |
| EC-00004 | a9hWt0000000cGfIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGfIAI) | Cuba | CU | Yes | V1 |
| EC-00005 | a9hWt0000000cGgIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGgIAI) | Belarus | BY | Yes | V1 |
| EC-00006 | a9hWt0000000cGhIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGhIAI) | Myanmar | MM | Yes | V1 |
| EC-00007 | a9hWt0000000cGiIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGiIAI) | Venezuela | VE | Yes | V1 |
| EC-00008 | a9hWt0000000cGjIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGjIAI) | Sudan | SD | Yes | V1 |
| EC-00009 | a9hWt0000000cGkIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGkIAI) | South Sudan | SS | Yes | V1 |
| EC-00010 | a9hWt0000000cGlIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGlIAI) | Libya | LY | Yes | V1 |
| EC-00011 | a9hWt0000000cGmIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9hWt0000000cGmIAI) | Somalia | SO | Yes | V1 |

---

## 9. Restricted Parties (25)

| Name | Id | Link | Entity | Country | Type | Source List | Vignette(s) |
|------|----|------|--------|---------|------|-------------|-------------|
| RP-00046 | a9jWt00000030RhIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RhIAI) | Korea Mining Development Trading Corp | KP | SDN | OFAC SDN List | V1 |
| RP-00047 | a9jWt00000030RiIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RiIAI) | Korea Ryonbong General Corporation | KP | SDN | OFAC SDN List | V1 |
| RP-00048 | a9jWt00000030RjIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RjIAI) | Reconnaissance General Bureau | KP | SDN | OFAC SDN List; UN Security Council | V1 |
| RP-00049 | a9jWt00000030RkIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RkIAI) | Islamic Republic of Iran Shipping Lines | IR | SDN | OFAC SDN List | V1 |
| RP-00050 | a9jWt00000030RlIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RlIAI) | Iran Electronics Industries | IR | SDN | OFAC SDN List; EU Sanctions | V1 |
| RP-00051 | a9jWt00000030RmIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RmIAI) | Sharif University of Technology | IR | Entity List | BIS Entity List | V1 |
| RP-00052 | a9jWt00000030RnIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RnIAI) | Aerospace Industries Organization | IR | SDN | OFAC SDN List | V1 |
| RP-00053 | a9jWt00000030RoIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RoIAI) | Rostec Corporation | RU | SDN | OFAC SDN List; EU Sanctions | V1 |
| RP-00054 | a9jWt00000030RpIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RpIAI) | MCST JSC (Elbrus processors) | RU | Entity List | BIS Entity List | V1 |
| RP-00055 | a9jWt00000030RqIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RqIAI) | Baikal Electronics JSC | RU | Entity List | BIS Entity List | V1 |
| RP-00056 | a9jWt00000030RrIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RrIAI) | AO MCST | RU | Entity List | BIS Entity List | V1 |
| RP-00057 | a9jWt00000030RsIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RsIAI) | T-Platforms | RU | Entity List | BIS Entity List | V1 |
| RP-00058 | a9jWt00000030RtIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RtIAI) | VNII Instrumentov | RU | Military End-User | BIS MEU List | V1 |
| RP-00059 | a9jWt00000030RuIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RuIAI) | Huawei Technologies Co., Ltd. | CN | Entity List | BIS Entity List | V1 |
| RP-00060 | a9jWt00000030RvIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RvIAI) | SMIC | CN | Entity List | BIS Entity List | V1 |
| RP-00061 | a9jWt00000030RwIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RwIAI) | ChangXin Memory Technologies (CXMT) | CN | Entity List | BIS Entity List | V1 |
| RP-00062 | a9jWt00000030RxIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RxIAI) | Yangtze Memory Technologies (YMTC) | CN | Entity List | BIS Entity List | V1 |
| RP-00063 | a9jWt00000030RyIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RyIAI) | Fujian Jinhua Integrated Circuit | CN | Entity List | BIS Entity List | V1 |
| RP-00064 | a9jWt00000030RzIAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030RzIAI) | NUDT | CN | Entity List | BIS Entity List | V1 |
| RP-00065 | a9jWt00000030S0IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S0IAI) | Scientific Studies and Research Centre | SY | SDN | OFAC SDN List; EU Sanctions | V1 |
| RP-00066 | a9jWt00000030S1IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S1IAI) | Integral JSC | BY | Entity List | BIS Entity List | V1 |
| RP-00067 | a9jWt00000030S2IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S2IAI) | Planar OAO | BY | Entity List | BIS Entity List | V1 |
| RP-00068 | a9jWt00000030S3IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S3IAI) | GAESA | CU | Restricted Entity | State Cuba Restricted List | V1 |
| RP-00069 | a9jWt00000030S4IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S4IAI) | Myanmar Economic Corporation (MEC) | MM | SDN | OFAC SDN List | V1 |
| RP-00070 | a9jWt00000030S5IAI | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9jWt00000030S5IAI) | Petroleos de Venezuela (PDVSA) | VE | SDN | OFAC SDN List | V1 |

---

## 10. ECCN Classifications (28)

| Name | Id | Link | ECCN | HS Code | Category | Vignette(s) |
|------|----|------|------|---------|----------|-------------|
| ECCN-00000 | a9gWt0000002RLtIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLtIAM) | 3D002 | 8523.49 | EDA Software | V1 |
| ECCN-00001 | a9gWt0000002RLuIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLuIAM) | 3D003 | 8523.49 | IC Design Software | V1 |
| ECCN-00002 | a9gWt0000002RLvIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLvIAM) | 3E001 | 8523.49 | Semiconductor Technology | V1 |
| ECCN-00003 | a9gWt0000002RLwIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLwIAM) | 3E002 | 8523.49 | IC Fabrication Technology | V1 |
| ECCN-00004 | a9gWt0000002RLxIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLxIAM) | 3E003 | 8523.49 | Resist/Mask Technology | V1 |
| ECCN-00005 | a9gWt0000002RLyIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLyIAM) | 3B001 | 8486.20 | Semiconductor Mfg Equipment | V1 |
| ECCN-00006 | a9gWt0000002RLzIAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RLzIAM) | 3B002 | 8486.30 | Mask/Reticle Equipment | V1 |
| ECCN-00007 | a9gWt0000002RM0IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM0IAM) | 5D002 | 8523.49 | Encryption Software | V1 |
| ECCN-00008 | a9gWt0000002RM1IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM1IAM) | 5D002.c.1 | 8523.49 | Cryptanalytic Software | V1 |
| ECCN-00009 | a9gWt0000002RM2IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM2IAM) | 4D001 | 8471.50 | Computer Software | V1 |
| ECCN-00010 | a9gWt0000002RM3IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM3IAM) | 4A003 | 8471.50 | HPC Digital Computers | V1 |
| ECCN-00011 | a9gWt0000002RM4IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM4IAM) | 4A004 | 8471.50 | GPU/Accelerator Computers | V1 |
| ECCN-00012 | a9gWt0000002RM5IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM5IAM) | 3D001 | 8523.49 | CAD/CAM Software | V1 |
| ECCN-00013 | a9gWt0000002RM6IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM6IAM) | 3D991 | 8523.49 | General IC Design | V1 |
| ECCN-00014 | a9gWt0000002RM7IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM7IAM) | 3B991 | 9030.82 | General Test Equipment | V1 |
| ECCN-00015 | a9gWt0000002RM8IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM8IAM) | 3A001 | 8542.31 | Electronic Components | V1 |
| ECCN-00016 | a9gWt0000002RM9IAM | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RM9IAM) | 3A002 | 8542.39 | General Purpose ICs | V1 |
| ECCN-00017 | a9gWt0000002RMAIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMAIA2) | 7D001 | 9014.20 | Navigation Software | V1 |
| ECCN-00018 | a9gWt0000002RMBIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMBIA2) | 5A001 | 8517.62 | Telecom Equipment | V1 |
| ECCN-00019 | a9gWt0000002RMCIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMCIA2) | 5D001 | 8523.49 | Telecom Software | V1 |
| ECCN-00020 | a9gWt0000002RMDIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMDIA2) | 3D002.a | 8523.49 | IC Physical Design (Calibre) | V1 |
| ECCN-00021 | a9gWt0000002RMEIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMEIA2) | 3D002.b | 8523.49 | Hardware Emulation (Veloce) | V1 |
| ECCN-00022 | a9gWt0000002RMFIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMFIA2) | 3D002.c | 8523.49 | Functional Verification (Questa) | V1 |
| ECCN-00023 | a9gWt0000002RMGIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMGIA2) | 3D002.d | 8523.49 | PCB Design (Xpedition) | V1 |
| ECCN-00024 | a9gWt0000002RMHIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMHIA2) | 3D002.e | 8523.49 | Digital Twin Simulation (ModelSim) | V1 |
| ECCN-00025 | a9gWt0000002RMIIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMIIA2) | 3D002.f | 8523.49 | High-Level Synthesis (Catapult) | V1 |
| ECCN-00026 | a9gWt0000002RMJIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMJIA2) | 3D002.g | 8523.49 | FPGA Synthesis (Precision) | V1 |
| ECCN-00027 | a9gWt0000002RMKIA2 | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9gWt0000002RMKIA2) | EAR99 | 8523.49 | Training Materials & Documentation | V1 |

---

## 11. Tariff Schedule (37)

| Name | Id | Link | Route | HS Code | Rate | Vignette(s) |
|------|----|------|-------|---------|------|-------------|
| TS-00000 | a9kWt000000BRbBIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbBIAW) | US → CN | 8523.49 | 25% | V1 |
| TS-00001 | a9kWt000000BRbCIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbCIAW) | US → CN | 8486.20 | 25% | V1 |
| TS-00002 | a9kWt000000BRbDIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbDIAW) | US → CN | 8542.31 | 25% | V1 |
| TS-00003 | a9kWt000000BRbEIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbEIAW) | US → IN | 8523.49 | 0% | V1 |
| TS-00004 | a9kWt000000BRbFIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbFIAW) | US → IN | 8486.20 | 7.5% | V1 |
| TS-00005 | a9kWt000000BRbGIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbGIAW) | US → KR | 8523.49 | 0% | V1 |
| TS-00006 | a9kWt000000BRbHIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbHIAW) | US → KR | 8486.20 | 0% | V1 |
| TS-00007 | a9kWt000000BRbIIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbIIAW) | US → TW | 8523.49 | 0% | V1 |
| TS-00008 | a9kWt000000BRbJIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbJIAW) | US → TW | 8486.20 | 0% | V1 |
| TS-00009 | a9kWt000000BRbKIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbKIAW) | US → JP | 8523.49 | 0% | V1 |
| TS-00010 | a9kWt000000BRbLIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbLIAW) | US → JP | 8486.20 | 0% | V1 |
| TS-00011 | a9kWt000000BRbMIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbMIAW) | US → IL | 8523.49 | 0% | V1 |
| TS-00012 | a9kWt000000BRbNIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbNIAW) | US → SG | 8523.49 | 0% | V1 |
| TS-00013 | a9kWt000000BRbOIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbOIAW) | US → MY | 8523.49 | 0% | V1 |
| TS-00014 | a9kWt000000BRbPIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbPIAW) | US → VN | 8523.49 | 0% | V1 |
| TS-00015 | a9kWt000000BRbQIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbQIAW) | US → TH | 8523.49 | 0% | V1 |
| TS-00016 | a9kWt000000BRbRIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbRIAW) | US → BR | 8523.49 | 0% | V1 |
| TS-00017 | a9kWt000000BRbSIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbSIAW) | US → MX | 8523.49 | 0% | V1 |
| TS-00018 | a9kWt000000BRbTIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbTIAW) | DE → CN | 8523.49 | 0% | V1 |
| TS-00019 | a9kWt000000BRbUIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbUIAW) | DE → CN | 8486.20 | 0% | V1 |
| TS-00020 | a9kWt000000BRbVIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbVIAW) | DE → US | 8523.49 | 0% | V1 |
| TS-00021 | a9kWt000000BRbWIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbWIAW) | DE → US | 8486.20 | 0% | V1 |
| TS-00022 | a9kWt000000BRbXIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbXIAW) | DE → IN | 8523.49 | 0% | V1 |
| TS-00023 | a9kWt000000BRbYIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbYIAW) | DE → IN | 8486.20 | 7.5% | V1 |
| TS-00024 | a9kWt000000BRbZIAW | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbZIAW) | DE → KR | 8523.49 | 0% | V1 |
| TS-00025 | a9kWt000000BRbaIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbaIAG) | DE → KR | 8486.20 | 0% | V1 |
| TS-00026 | a9kWt000000BRbbIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbbIAG) | DE → TW | 8523.49 | 0% | V1 |
| TS-00027 | a9kWt000000BRbcIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbcIAG) | DE → JP | 8523.49 | 0% | V1 |
| TS-00028 | a9kWt000000BRbdIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbdIAG) | DE → JP | 8486.20 | 0% | V1 |
| TS-00029 | a9kWt000000BRbeIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbeIAG) | DE → SG | 8523.49 | 0% | V1 |
| TS-00030 | a9kWt000000BRbfIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbfIAG) | DE → VN | 8523.49 | 0% | V1 |
| TS-00031 | a9kWt000000BRbgIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbgIAG) | DE → MX | 8523.49 | 0% | V1 |
| TS-00032 | a9kWt000000BRbhIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbhIAG) | US → CN | 8471.50 | 25% | V1 |
| TS-00033 | a9kWt000000BRbiIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbiIAG) | US → CN | 9030.82 | 25% | V1 |
| TS-00034 | a9kWt000000BRbjIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbjIAG) | US → CN | 8517.62 | 25% | V1 |
| TS-00035 | a9kWt000000BRbkIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRbkIAG) | DE → BR | 8523.49 | 0% | V1 |
| TS-00036 | a9kWt000000BRblIAG | [Open](https://storm-db63fb470328c9.my.salesforce.com/a9kWt000000BRblIAG) | DE → BR | 8486.20 | 14% | V1 |

---

## 12. Agentforce Agents (2)

| Label | Id | Link | Developer Name | Vignette(s) |
|-------|----|------|---------------|-------------|
| HAV Operations Agent | 0XxWt000000wiqHKAQ | [Open](https://storm-db63fb470328c9.my.salesforce.com/0XxWt000000wiqHKAQ) | HAV_Operations_Agent | V1, V2, V3, V5, V6 |
| Trade Compliance Sentinel | 0XxWt000000wkaLKAQ | [Open](https://storm-db63fb470328c9.my.salesforce.com/0XxWt000000wkaLKAQ) | Trade_Compliance_Sentinel | V1 |

### 4F. Assets — Hierarchy: Facilities (6)

These represent the top-level colocation sites. Each Facility is the parent of the Rack assets at that location.

| Name | Id | Link | Serial Number | Status | Tier | Location | Vignette(s) |
|------|----|------|--------------|--------|------|----------|-------------|
| Facility — San Jose Colo (SJ1) | 02iWt000005K33hIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33hIAC) | FAC-SJ1 | Active | Facility | San Jose Colo (SJ1) | V2, V5 |
| Facility — Austin Colo (AUS1) | 02iWt000005K33iIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33iIAC) | FAC-AUS1 | Active | Facility | Austin Colo (AUS1) | V2, V5 |
| Facility — Hsinchu Colo (HSC1) | 02iWt000005K33jIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33jIAC) | FAC-HSC1 | Active | Facility | Hsinchu Colo (HSC1) | V2, V5 |
| Facility — Munich Colo (MUC1) | 02iWt000005K33kIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33kIAC) | FAC-MUC1 | Active | Facility | Munich Colo (MUC1) | V2, V5 |
| Facility — Seoul Colo (SEL1) | 02iWt000005K33lIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33lIAC) | FAC-SEL1 | Active | Facility | Seoul Colo (SEL1) | V2, V5 |
| Facility — Bangalore Colo (BLR1) | 02iWt000005K33mIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33mIAC) | FAC-BLR1 | Active | Facility | Bangalore Colo (BLR1) | V2, V5 |

### 4G. Assets — Hierarchy: Racks (27)

Each Rack belongs to a Facility (via `Parent_Asset__c`) and is the parent of the Blade assets in that rack position.

**San Jose Colo (SJ1) — 7 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R02 — SJ1 | 02iWt000005K33nIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33nIAC) | RACK-SJ1-R02 | Active | R02 | V2, V5 |
| Rack R03 — SJ1 | 02iWt000005K33oIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33oIAC) | RACK-SJ1-R03 | Active | R03 | V2, V5 |
| Rack R04 — SJ1 | 02iWt000005K33pIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33pIAC) | RACK-SJ1-R04 | Active | R04 | V2, V5 |
| Rack R06 — SJ1 | 02iWt000005K33qIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33qIAC) | RACK-SJ1-R06 | Active | R06 | V2, V5 |
| Rack R08 — SJ1 | 02iWt000005K33rIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33rIAC) | RACK-SJ1-R08 | Active | R08 | V2, V5 |
| Rack R09 — SJ1 | 02iWt000005K33sIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33sIAC) | RACK-SJ1-R09 | Active | R09 | V2, V5 |

**Austin Colo (AUS1) — 5 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R01 — AUS1 | 02iWt000005K33tIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33tIAC) | RACK-AUS1-R01 | Active | R01 | V2, V5 |
| Rack R02 — AUS1 | 02iWt000005K33uIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33uIAC) | RACK-AUS1-R02 | Active | R02 | V2, V5 |
| Rack R03 — AUS1 | 02iWt000005K33vIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33vIAC) | RACK-AUS1-R03 | Active | R03 | V2, V5 |
| Rack R05 — AUS1 | 02iWt000005K33wIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33wIAC) | RACK-AUS1-R05 | Active | R05 | V2, V5 |
| Rack R06 — AUS1 | 02iWt000005K33xIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33xIAC) | RACK-AUS1-R06 | Active | R06 | V2, V5 |

**Hsinchu Colo (HSC1) — 7 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R01 — HSC1 | 02iWt000005K33yIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33yIAC) | RACK-HSC1-R01 | Active | R01 | V2, V5 |
| Rack R02 — HSC1 | 02iWt000005K33zIAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K33zIAC) | RACK-HSC1-R02 | Active | R02 | V2, V5 |
| Rack R03 — HSC1 | 02iWt000005K340IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K340IAC) | RACK-HSC1-R03 | Active | R03 | V2, V5 |
| Rack R04 — HSC1 | 02iWt000005K341IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K341IAC) | RACK-HSC1-R04 | Active | R04 | V2, V5 |
| Rack R06 — HSC1 | 02iWt000005K342IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K342IAC) | RACK-HSC1-R06 | Active | R06 | V2, V5 |
| Rack R07 — HSC1 | 02iWt000005K343IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K343IAC) | RACK-HSC1-R07 | Active | R07 | V2, V5 |
| Rack R08 — HSC1 | 02iWt000005K344IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K344IAC) | RACK-HSC1-R08 | Active | R08 | V2, V5 |

**Munich Colo (MUC1) — 2 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R01 — MUC1 | 02iWt000005K345IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K345IAC) | RACK-MUC1-R01 | Active | R01 | V2, V5 |
| Rack R03 — MUC1 | 02iWt000005K346IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K346IAC) | RACK-MUC1-R03 | Active | R03 | V2, V5 |
| Rack R04 — MUC1 | 02iWt000005K347IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K347IAC) | RACK-MUC1-R04 | Active | R04 | V2, V5 |

**Seoul Colo (SEL1) — 3 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R01 — SEL1 | 02iWt000005K348IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K348IAC) | RACK-SEL1-R01 | Active | R01 | V2, V5 |
| Rack R02 — SEL1 | 02iWt000005K349IAC | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K349IAC) | RACK-SEL1-R02 | Active | R02 | V2, V5 |
| Rack R03 — SEL1 | 02iWt000005K34AIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K34AIAS) | RACK-SEL1-R03 | Active | R03 | V2, V5 |

**Bangalore Colo (BLR1) — 3 Racks:**

| Name | Id | Link | Serial Number | Status | Rack Position | Vignette(s) |
|------|----|------|--------------|--------|--------------|-------------|
| Rack R01 — BLR1 | 02iWt000005K34BIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K34BIAS) | RACK-BLR1-R01 | Active | R01 | V2, V5 |
| Rack R02 — BLR1 | 02iWt000005K34CIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K34CIAS) | RACK-BLR1-R02 | Active | R02 | V2, V5 |
| Rack R03 — BLR1 | 02iWt000005K34DIAS | [Open](https://storm-db63fb470328c9.my.salesforce.com/02iWt000005K34DIAS) | RACK-BLR1-R03 | Active | R03 | V2, V5 |

> **Blade tier assignment:** All 39 blade-level assets (from sections 4A–4E with `Rack_Position__c` values, plus the JK37 blades in section 4B) were updated with `Asset_Tier__c = 'Blade'` and `Parent_Asset__c` pointing to their respective Rack asset above. The 3 unlocated spare Tower assets (T-301, T-302, T-303) were also tagged as Blade tier but have no parent.

---

## Summary

| Object Type | Count | Primary Vignette(s) |
|-------------|-------|---------------------|
| Accounts (EDA-relevant) | 11 | V1–V6 |
| Products — EDA Software | 7 | V1, V3 |
| Products — Emulation Hardware | 7 | V2, V5, V6 |
| Assets — Emulation Fleet (incl. hierarchy) | 161 | V2, V5, V6 |
| ↳ Facilities | 6 | V2, V5 |
| ↳ Racks | 27 | V2, V5 |
| ↳ Blades (tagged) | 39 | V2, V5, V6 |
| ↳ Towers & sub-components | 89 | V2, V5, V6 |
| Sales Agreements / Orders | 7 | V1, V4 |
| Work Orders (EDA) | 7 | V6 |
| Compliance Records | 1 | V1 |
| Embargo Countries | 12 | V1 |
| Restricted Parties | 25 | V1 |
| ECCN Classifications | 28 | V1 |
| Tariff Schedule | 37 | V1 |
| Agentforce Agents | 2 | V1–V6 |
| **Total** | **305** | |

---

*Updated September 23, 2026 — Added 33 hierarchy assets (6 Facility + 27 Rack) and Asset_Tier__c / Parent_Asset__c annotations*
