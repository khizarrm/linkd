import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { companyProfiles, employees } from "../db/companies.schema";

export class ProtectedCompaniesListRoute extends OpenAPIRoute {
  schema = {
    tags: ["Protected 🔒"],
    summary: "List All Companies",
    responses: {
      "200": {
        description: "Companies retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              companies: z.array(
                z.object({
                  id: z.number(),
                  companyName: z.string(),
                  website: z.string().nullable(),
                  yearFounded: z.number().nullable(),
                  description: z.string().nullable(),
                  techStack: z.string().nullable(),
                  employeeCountMin: z.number().nullable(),
                  employeeCountMax: z.number().nullable(),
                  revenue: z.string().nullable(),
                  funding: z.string().nullable(),
                  headquarters: z.string().nullable(),
                  industry: z.string().nullable(),
                  createdAt: z.string().nullable(),
                })
              ),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const auth = c.get("auth");
    const env = c.env;
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = drizzle(env.DB, { schema });
    const allCompanies = await db.query.companyProfiles.findMany({
      orderBy: [desc(companyProfiles.createdAt)],
    });

    return {
      success: true,
      companies: allCompanies.map((company) => ({
        id: company.id,
        companyName: company.companyName,
        website: company.website,
        yearFounded: company.yearFounded,
        description: company.description,
        techStack: company.techStack,
        employeeCountMin: company.employeeCountMin,
        employeeCountMax: company.employeeCountMax,
        revenue: company.revenue,
        funding: company.funding,
        headquarters: company.headquarters,
        industry: company.industry,
        createdAt: company.createdAt,
      })),
    };
  }
}

export class ProtectedCompanyEmployeesRoute extends OpenAPIRoute {
  schema = {
    tags: ["Protected 🔒"],
    summary: "Get Employees by Company ID",
    request: {
      params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      }),
    },
    responses: {
      "200": {
        description: "Employees retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              employees: z.array(
                z.object({
                  id: z.number(),
                  employeeName: z.string(),
                  employeeTitle: z.string().nullable(),
                  email: z.string().nullable(),
                  companyId: z.number(),
                  createdAt: z.string().nullable(),
                })
              ),
            }),
          },
        },
      },
      "404": {
        description: "Company not found",
      },
    },
  };

  async handle(c: any) {
    const auth = c.get("auth");
    const env = c.env;
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);

    const db = drizzle(env.DB, { schema });
    
    // Verify company exists
    const company = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, id),
    });

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    // Get employees for this company
    const companyEmployees = await db.query.employees.findMany({
      where: eq(employees.companyId, id),
      orderBy: [desc(employees.createdAt)],
    });

    return {
      success: true,
      employees: companyEmployees.map((employee) => ({
        id: employee.id,
        employeeName: employee.employeeName,
        employeeTitle: employee.employeeTitle,
        email: employee.email,
        companyId: employee.companyId,
        createdAt: employee.createdAt,
      })),
    };
  }
}

