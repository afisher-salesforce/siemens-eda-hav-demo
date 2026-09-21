/**
 * Agentforce Invocable Action: Look up emulator assets by name, location, or customer.
 * One @InvocableMethod per class — required by Salesforce.
 */
public with sharing class HAV_Agent_AssetLookup {

    public class Input {
        @InvocableVariable(description='Search term — asset name, serial number, customer name, or location name')
        public String searchTerm;

        @InvocableVariable(description='Optional status filter: Installed, Shipped, Purchased')
        public String statusFilter;
    }

    public class Output {
        @InvocableVariable(description='Formatted asset search results')
        public String result;
    }

    @InvocableMethod(
        label='Search Emulator Assets'
        description='Searches the emulator asset fleet by name, serial number, customer, or location. Returns asset details including utilization, power draw, lease type, and contract dates.'
    )
    public static List<Output> searchAssets(List<Input> inputs) {
        Output out = new Output();
        try {
            Input inp = inputs[0];
            String term = String.isNotBlank(inp.searchTerm) ? '%' + inp.searchTerm.trim() + '%' : '%';

            String query = 'SELECT Name, SerialNumber, Status, Product2.Name, Account.Name, '
                + 'Utilization_Pct__c, Power_Draw_kW__c, Rack_Position__c, Lease_Type__c, '
                + 'Contract_End_Date__c, InstallDate '
                + 'FROM Asset '
                + 'WHERE Product2.Family = \'Emulation Systems\' '
                + 'AND (Name LIKE :term OR SerialNumber LIKE :term OR Account.Name LIKE :term) ';

            if (String.isNotBlank(inp.statusFilter)) {
                query += 'AND Status = :inp.statusFilter ';
            }
            query += 'ORDER BY Name LIMIT 20';

            // Use dynamic query since we have conditional WHERE
            List<Asset> assets = Database.query(query);

            if (assets.isEmpty()) {
                out.result = 'No emulator assets found matching "' + inp.searchTerm + '".';
            } else {
                List<String> lines = new List<String>();
                lines.add('Found ' + assets.size() + ' asset(s):');
                lines.add('');
                for (Asset a : assets) {
                    lines.add('• ' + a.Name + ' (' + (a.Product2 != null ? a.Product2.Name : 'Unknown') + ')');
                    lines.add('  Customer: ' + (a.Account != null ? a.Account.Name : 'N/A'));
                    lines.add('  Status: ' + (a.Status != null ? a.Status : 'N/A')
                        + ' | Utilization: ' + (a.Utilization_Pct__c != null ? String.valueOf(a.Utilization_Pct__c.setScale(0)) + '%' : 'N/A')
                        + ' | Power: ' + (a.Power_Draw_kW__c != null ? String.valueOf(a.Power_Draw_kW__c) + ' kW' : 'N/A'));
                    lines.add('  Rack: ' + (a.Rack_Position__c != null ? a.Rack_Position__c : 'N/A')
                        + ' | Lease: ' + (a.Lease_Type__c != null ? a.Lease_Type__c : 'N/A')
                        + ' | Contract End: ' + (a.Contract_End_Date__c != null ? String.valueOf(a.Contract_End_Date__c) : 'N/A'));
                    lines.add('');
                }
                out.result = String.join(lines, '\n');
            }
        } catch (Exception e) {
            out.result = 'Error searching assets: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }
}