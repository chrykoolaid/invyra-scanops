**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## Invyra ScanOps stage status

Current package: Stage F — Task System v1.

Active scanner workflows:
- Product Lookup
- Stock Count
- Receiving
- Replenish
- Gap Scan
- Markdowns
- Waste
- Expiry Check
- Tasks

Stage F adds a dedicated task queue workflow while keeping the Home screen as a clean 3-column scanner launcher. The old Home task display has been removed so task content cannot stretch the dashboard. Tasks support open operational work, task detail, Start Task, Complete Task, Mark Blocked, linked workflow routing, and task events. Later-stage modules such as Offline Sync, Labels full engine, Transfers, AI/Decision Engine, and full audit hardening remain intentionally inactive.
