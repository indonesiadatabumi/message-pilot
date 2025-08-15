      "use client"
      
      import {
        ColumnDef,
        flexRender,
        getCoreRowModel,
        useReactTable,
      } from "@tanstack/react-table"
      
      import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
      } from "@/components/ui/table"
      import { Button } from "@/components/ui/button"
      import { useToast } from "@/hooks/use-toast"
      
      interface ApiKey {
          _id: string;
          name: string;
          key: string;
          expiration: string | null;
          createdAt: string;
      }
      
      interface ApiKeyTableProps {
        apiKeys: ApiKey[];
        onKeyRevoked: () => void;
      }
      
      export const ApiKeyTable = ({ apiKeys, onKeyRevoked }: ApiKeyTableProps) => {
        const { toast } = useToast();
      
        const copyToClipboard = (text: string, name: string) => {
          navigator.clipboard.writeText(text);
          toast({
            title: "Copied to Clipboard",
            description: `The key for "${name}" has been copied.`,
          });
        };
      
        const columns: ColumnDef<ApiKey>[] = [
          {
            accessorKey: "name",
            header: "Name",
          },
          {
            accessorKey: "key",
            header: "Key",
            cell: ({ row }) => {
              const apiKey = row.original;
              const truncatedKey = `${apiKey.key.substring(0, 8)}...`;
              return (
                <div className="flex items-center gap-2">
                  <span>{truncatedKey}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(apiKey.key, apiKey.name)}>
                    Copy
                  </Button>
                </div>
              );
            },
          },
          {
            accessorKey: "expiration",
            header: "Expiration",
            cell: ({ row }) => {
              const expiration = row.original.expiration;
              return expiration ? new Date(expiration).toLocaleString() : "Never";
            },
          },
          {
              accessorKey: "createdAt",
              header: "Created At",
              cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
          },
          {
            id: "actions",
            cell: ({ row }) => {
              const apiKey = row.original;
      
              const handleRevoke = async () => {
                  if (!confirm(`Are you sure you want to revoke the key "${apiKey.name}"?`)) return;
      
                  // Here you would call the API to revoke the key
                  console.log("Revoking key:", apiKey._id);
                  toast({
                      title: "Key Revoked",
                      description: `The key "${apiKey.name}" has been revoked.`,
                  });
                  // onKeyRevoked(); // Uncomment this when API is ready
              };
      
              return (
                <Button variant="destructive" size="sm" onClick={handleRevoke}>
                  Revoke
                </Button>
              );
            },
          },
        ];
      
        const table = useReactTable({
          data: apiKeys,
          columns,
          getCoreRowModel: getCoreRowModel(),
        });
      
        return (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No API Keys found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )
      }
      