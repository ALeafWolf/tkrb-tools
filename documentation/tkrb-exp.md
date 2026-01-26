# EXP Structure Overview (刀剣乱舞)

This document explains how experience (EXP) is structured and calculated in this project.

---

## 1. Two Sword States

There are two distinct states for swords:

- **特 (toku)**  
  Normal state, levels **1–99**

- **極 (kiwame)**  
  Upgraded state, levels **1–199**

Each state uses a different EXP curve and must be handled separately.

---

## 2. 特 (Lv1–99) EXP

- All sword types share **the same EXP requirements**.
- EXP is stored as **cumulative EXP**:
  - **Lv1 = 0 EXP**
  - Higher levels store the **total EXP required to reach that level**.
- EXP needed between two levels is calculated as the difference between their cumulative values.

This makes 特 EXP simple and uniform across all sword types.

---

## 3. 極 (Lv1–199) EXP Structure

極 EXP is divided into **three segments**.

### 3.1 Lv1–34 (Shared)

- All sword types share **the same EXP curve**.
- Stored once and reused for every type.

---

### 3.2 Lv35–99 (Type-dependent)

- EXP requirements **diverge by sword type**:
  - 短刀 (tantou)
  - 脇差 (wakizashi)
  - 打刀 (uchigatana)
  - 太刀 (tachi)
  - 大太刀 (ootachi)
  - 槍 (yari)
  - 薙刀 (naginata)
- Each type has its own **absolute cumulative EXP table** for Lv35–99.
- Values represent the total EXP required to reach that level, not incremental EXP.

---

### 3.3 Lv100–199 (Shared)

- From Lv100 onward, **all sword types follow the same EXP increase pattern**.
- Differences between types come only from their **cumulative EXP at Lv100**.
- This is modeled as:
  - Each type stores its **cumulative EXP at Lv100**
  - A shared table stores the **additional EXP required from Lv100 to higher levels**

Final cumulative EXP is calculated as:

```text
EXP(level) = EXP_at_Lv100(type) + shared_delta_from_100(level)
