/** Capacity work orders: apply the capacity effect when a provision / move / decommission job completes or is canceled. */
trigger HAV_WorkOrderCapacity on WorkOrder (after update) {
    HAV_CapacityWorkService.onWorkOrdersChanged(Trigger.new, Trigger.oldMap);
}
