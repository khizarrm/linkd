import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { companyProfiles, employees } from "../db/companies.schema";

export class ProtectedCompaniesListRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
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
                }),
              ),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    console.log("Handling company request");
    const env = c.env;
    const db = drizzle(env.DB, { schema });

    const companiesWithEmployees = await db
      .selectDistinct({
        id: companyProfiles.id,
        companyName: companyProfiles.companyName,
        website: companyProfiles.website,
        yearFounded: companyProfiles.yearFounded,
        description: companyProfiles.description,
        techStack: companyProfiles.techStack,
        employeeCountMin: companyProfiles.employeeCountMin,
        employeeCountMax: companyProfiles.employeeCountMax,
        revenue: companyProfiles.revenue,
        funding: companyProfiles.funding,
        headquarters: companyProfiles.headquarters,
        industry: companyProfiles.industry,
        createdAt: companyProfiles.createdAt,
      })
      .from(companyProfiles)
      .innerJoin(
        employees,
        eq(companyProfiles.companyName, employees.companyName),
      )
      .orderBy(desc(companyProfiles.createdAt));

    return {
      success: true,
      companies: companiesWithEmployees,
    };
  }
}

export class ProtectedCompanyEmployeesRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
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
                  companyName: z.string().nullable(),
                  createdAt: z.string().nullable(),
                }),
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
    console.log("Handling company employees request");
    const env = c.env;
    const { id } = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.params,
    );

    const db = drizzle(env.DB, { schema });

    const company = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, id),
    });

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const companyEmployees = await db.query.employees.findMany({
      where: eq(employees.companyName, company.companyName),
      orderBy: [desc(employees.createdAt)],
    });

    return {
      success: true,
      employees: companyEmployees.map((employee) => ({
        id: employee.id,
        employeeName: employee.employeeName,
        employeeTitle: employee.employeeTitle,
        email: employee.email,
        companyName: employee.companyName,
        createdAt: employee.createdAt,
      })),
    };
  }
}
