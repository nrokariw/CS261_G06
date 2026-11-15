# CampusShare UML & Data Flow Diagrams (US-01 to US-09)

## 1. DFD Level 0 — Context Diagram

```mermaid
flowchart LR
    Lender["Lender (TU Student / Staff)"]
    Borrower["Borrower (TU Student / Staff)"]
    System(("0.0 CampusShare Lending System"))
    TUAPI["TU REST API (Active Directory)"]

    Lender -->|"Credentials, Item Data, Approvals, Proofs"| System
    System -->|"JWT, Requests, Loan History"| Lender

    Borrower -->|"Credentials, Search, Borrow Requests, Proofs"| System
    System -->|"JWT, Available Items, Status, Proofs"| Borrower

    System -->|"UserName, PassWord, App-Key"| TUAPI
    TUAPI -->|"Auth Status, Profile, Role"| System
```

---

## 2. DFD Level 1 — System Processes (US-01 to US-09)

```mermaid
flowchart LR
    User["TU User (Lender / Borrower)"]
    TUAPI["TU REST API"]

    P1(("1.0 Auth & Profile Sync (US-09)"))
    P2(("2.0 Item Management (US-01, US-02, US-04)"))
    P3(("3.0 Borrow Requests (US-03, US-05)"))
    P4(("4.0 Handover & Return Proof (US-06, US-07)"))
    P5(("5.0 History & Audit (US-08)"))

    D1[("D1: Users")]
    D2[("D2: Items")]
    D3[("D3: BorrowRequests")]
    D4[("D4: Transactions")]
    D5[("D5: Evidence & Storage")]

    User -->|"Credentials"| P1
    P1 -->|"Verify"| TUAPI
    TUAPI -->|"Profile & Role"| P1
    P1 <-->|"Upsert User"| D1
    P1 -->|"JWT & User"| User

    User -->|"Listing / Search / Edit"| P2
    P2 <-->|"Read / Write Items"| D2
    P2 <-->|"Item Images"| D5
    P2 -->|"Item List"| User

    User -->|"Request / Approve / Reject"| P3
    D2 -->|"Item Status"| P3
    P3 <-->|"Save / Update Request"| D3
    P3 -->|"Update Item Status"| D2
    P3 -->|"Request Status"| User

    User -->|"Handover / Return Photo & Note"| P4
    D3 -->|"Accepted Request"| P4
    P4 <-->|"Start / Complete Tx"| D4
    P4 -->|"Save Proof File & Metadata"| D5
    P4 -->|"Update Item Status"| D2
    P4 -->|"Borrowed / Returned"| User

    User -->|"View History"| P5
    D3 -->|"Request Info"| P5
    D4 -->|"Tx Timeline"| P5
    D5 -->|"Handover & Return Proofs"| P5
    P5 -->|"History & Photos"| User
```

---

## 3. Domain Model (UML Class Diagram)

```mermaid
classDiagram
    class User {
        +String studentId
        +String username
        +String fullName
        +String email
        +String faculty
        +String department
        +String role
        +String authProvider
    }
    class Item {
        +String id
        +String title
        +String category
        +String description
        +String imageUrl
        +ItemStatus status
    }
    class BorrowRequest {
        +String id
        +LocalDateTime startDate
        +LocalDateTime endDate
        +String reason
        +RequestStatus status
    }
    class Transaction {
        +String id
        +TransactionStatus status
        +LocalDateTime borrowedAt
        +LocalDateTime returnedAt
    }
    class EvidenceProof {
        +String id
        +ProofType proofType
        +String imageUrl
        +String note
        +LocalDateTime capturedAt
    }

    User "1" --> "0..*" Item : owns
    User "1" --> "0..*" BorrowRequest : submits
    Item "1" --> "0..*" BorrowRequest : receives
    BorrowRequest "1" --> "0..1" Transaction : creates
    Transaction "1" *-- "0..*" EvidenceProof : contains
    User "1" --> "0..*" EvidenceProof : uploads
```

---

## 4. Entity Lifecycle (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : US-01 Create Item
    AVAILABLE --> RESERVED : US-05 Approve Request
    RESERVED --> BORROWED : US-06 Handover Proof
    BORROWED --> AVAILABLE : US-07 Return Proof & Complete
    AVAILABLE --> UNAVAILABLE : US-04 Delete Item
```

---

## 5. Compact Sequence Diagrams (US-01 to US-09)

### US-01: Create Item Listing

```mermaid
sequenceDiagram
    autonumber
    actor Lender
    participant FE as Frontend
    participant BE as Backend
    participant Storage
    participant DB

    Lender->>FE: Submit item form + image
    FE->>BE: POST /api/items
    alt Invalid input or file
        BE-->>FE: 400 Bad Request
        FE-->>Lender: Show validation error
    else Valid
        BE->>Storage: Save image
        Storage-->>BE: imageUrl
        BE->>DB: Save Item (AVAILABLE)
        BE-->>FE: 201 Created
        FE-->>Lender: Display new item
    end
```

### US-02: Browse Available Items

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB

    User->>FE: Open Browse page
    FE->>BE: GET /api/items?status=AVAILABLE
    BE->>DB: Query AVAILABLE items
    DB-->>BE: Item list
    BE-->>FE: 200 OK
    FE-->>User: Render items or empty state
```

### US-03: Submit Borrow Request

```mermaid
sequenceDiagram
    autonumber
    actor Borrower
    participant FE as Frontend
    participant BE as Backend
    participant DB

    Borrower->>FE: Submit dates & reason
    FE->>BE: POST /api/requests
    BE->>DB: Check Item owner & status
    alt Own item or unavailable
        BE-->>FE: 400 / 409 Error
        FE-->>Borrower: Show error alert
    else Valid
        BE->>DB: Save BorrowRequest (PENDING)
        BE-->>FE: 201 Created
        FE-->>Borrower: Show Pending status
    end
```

### US-04: Update or Delete Item Listing

```mermaid
sequenceDiagram
    autonumber
    actor Lender
    participant FE as Frontend
    participant BE as Backend
    participant DB

    Lender->>FE: Edit or delete item
    FE->>BE: PUT / DELETE /api/items/{id}
    BE->>DB: Check owner & AVAILABLE status
    alt Not owner
        BE-->>FE: 403 Forbidden
        FE-->>Lender: Access denied
    else Item borrowed
        BE-->>FE: 409 Conflict
        FE-->>Lender: Cannot modify active loan
    else Allowed
        BE->>DB: Update or soft-delete Item
        BE-->>FE: 200 OK
        FE-->>Lender: Refresh listings
    end
```

### US-05: Approve or Reject Borrow Request

```mermaid
sequenceDiagram
    autonumber
    actor Lender
    participant FE as Frontend
    participant BE as Backend
    participant DB

    Lender->>FE: Click Approve or Reject
    FE->>BE: POST /api/requests/{id}/approve or /reject
    BE->>DB: Verify owner & PENDING status
    alt Not owner or invalid state
        BE-->>FE: 403 / 409 Error
        FE-->>Lender: Show error alert
    else Approve
        BE->>DB: Request -> ACCEPTED, Item -> RESERVED
        BE-->>FE: 200 OK
        FE-->>Lender: Ready for handover
    else Reject
        BE->>DB: Request -> REJECTED, Item stays AVAILABLE
        BE-->>FE: 200 OK
        FE-->>Lender: Request rejected
    end
```

### US-06: Record Handover Evidence

```mermaid
sequenceDiagram
    autonumber
    actor User as Lender / Borrower
    participant FE as Frontend
    participant BE as Backend
    participant Storage
    participant DB

    User->>FE: Upload handover photo & note
    FE->>BE: POST /api/transactions/start/{requestId} & /api/evidence/transaction/{id}
    alt Missing image or non-participant
        BE-->>FE: 400 / 403 Error
        FE-->>User: Show error alert
    else Valid
        BE->>Storage: Store photo
        Storage-->>BE: imageUrl
        BE->>DB: Transaction (ACTIVE), Proof (HANDOVER), Item -> BORROWED
        BE-->>FE: 200 OK
        FE-->>User: Status updated to Borrowed
    end
```

### US-07: Record Return Evidence

```mermaid
sequenceDiagram
    autonumber
    actor User as Lender / Borrower
    participant FE as Frontend
    participant BE as Backend
    participant Storage
    participant DB

    User->>FE: Upload return photo & note
    FE->>BE: POST /api/evidence/transaction/{id} & /api/transactions/{id}/complete
    alt Missing image or non-participant
        BE-->>FE: 400 / 403 Error
        FE-->>User: Show error alert
    else Valid
        BE->>Storage: Store photo
        Storage-->>BE: imageUrl
        BE->>DB: Proof (RETURN), Transaction -> COMPLETED, Item -> AVAILABLE
        BE-->>FE: 200 OK
        FE-->>User: Status updated to Returned & Available
    end
```

### US-08: View Borrow History & Evidence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB

    User->>FE: Open borrow history & evidence
    FE->>BE: GET /api/transactions/borrower/{id} or /item/{itemId}
    BE->>DB: Fetch Transaction & EvidenceProof
    alt Non-participant
        BE-->>FE: 403 Forbidden
        FE-->>User: Access denied
    else Participant
        BE-->>FE: 200 OK (handover & return proofs)
        FE-->>User: Render photos, notes & timestamps
    end
```

### US-09: Login with TU Account

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant Guard as Cache & RateLimit
    participant TU as TU REST API
    participant DB

    User->>FE: Submit credentials
    FE->>BE: POST /api/auth/login
    alt Invalid format
        BE-->>FE: 400 Bad Request
    else Cache hit
        Guard-->>BE: Cached profile
        BE->>DB: Upsert user (no passwordHash)
        BE-->>FE: 200 OK {JWT, user}
    else Cache miss
        BE->>Guard: Check IP limit (5 / 10m)
        alt Exceeded
            Guard-->>BE: 429 Too Many Requests
        else Allowed
            BE->>TU: POST /auth/Ad/verify
            alt Invalid or Inactive
                TU-->>BE: 401 / 403 Error
                BE-->>FE: 401 / 403 Error
            else Active account
                TU-->>BE: 200 {profile, role}
                BE->>Guard: Cache profile (5m TTL)
                BE->>DB: Upsert user (STUDENT / STAFF)
                BE-->>FE: 200 OK {JWT, user}
            end
        end
    end
    FE-->>User: Redirect home or show alert
```
